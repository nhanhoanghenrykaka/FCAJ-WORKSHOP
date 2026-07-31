package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

import dev.namphamcse.shopsflow.config.VnPayConfig;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.util.VnPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VnPayServiceTest {

    @Mock
    private OrderRepository orderRepo;

    @Mock
    private VnPayConfig vnPayConfig;

    @Mock
    private HttpServletRequest request;

    @Mock
    NotificationService notificationService;
    @Mock
    OrderHistoryService orderHistoryService;
    @Mock
    AuditService auditService;

    @InjectMocks
    private VnPayService vnPayService;

    private User user;
    private Order order;

    @BeforeEach
    void setUp() {
        user = new User("Nam", "nam@x.com", "pw");
        user.setId(1L);

        order = new Order(user, new BigDecimal("4.00")); // USD storefront amount -> 100,000 VND at 25,000 VND/USD
        order.setId(10L);
        lenient().when(vnPayConfig.getUsdToVndRate()).thenReturn(new BigDecimal("25000"));
        order.setStatus(OrderStatus.PENDING);
    }

    @Test
    void createPaymentLink_success() {
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));
        when(request.getHeader("X-FORWARDED-FOR")).thenReturn("127.0.0.1");
        when(vnPayConfig.getTmnCode()).thenReturn("2QTY7D9E");
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(vnPayConfig.getReturnUrl()).thenReturn("http://localhost:5173/payment-result");
        when(vnPayConfig.getApiUrl()).thenReturn("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");

        String payUrl = vnPayService.createPaymentLink(10L, user, request);

        assertNotNull(payUrl);
        assertTrue(payUrl.startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"));
        assertTrue(payUrl.contains("vnp_TmnCode=2QTY7D9E"));
        assertTrue(payUrl.contains("vnp_Amount=10000000")); // 4 USD * 25,000 VND/USD * 100 = 10,000,000
        assertTrue(payUrl.contains("vnp_TxnRef=10"));
        assertTrue(payUrl.contains("vnp_SecureHash="));
    }

    @Test
    void createPaymentLink_orderNotFound() {
        when(orderRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                vnPayService.createPaymentLink(999L, user, request));
    }

    @Test
    void createPaymentLink_orderNotOwnedByUser() {
        User otherUser = new User("Other", "other@x.com", "pw");
        otherUser.setId(2L);
        order.setUser(otherUser);

        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class, () ->
                vnPayService.createPaymentLink(10L, user, request));
    }

    @Test
    void createPaymentLink_orderNotPending() {
        order.setStatus(OrderStatus.PAID);

        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class, () ->
                vnPayService.createPaymentLink(10L, user, request));
    }

    @Test
    void createPaymentLink_pendingButAlreadyPaid_isRejected() {
        order.setVnpayTransId("VNP-PAID-123");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        BusinessRuleViolationException exception = assertThrows(BusinessRuleViolationException.class, () ->
                vnPayService.createPaymentLink(10L, user, request));

        assertTrue(exception.getMessage().contains("already been paid"));
    }

    @Test
    void createPaymentLink_pendingButReturnWorkflowStarted_isRejected() {
        order.setReturnReason("Refunded legacy order");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        BusinessRuleViolationException exception = assertThrows(BusinessRuleViolationException.class, () ->
                vnPayService.createPaymentLink(10L, user, request));

        assertTrue(exception.getMessage().contains("return/refund"));
    }

    @Test
    void processIpn_success_paymentApproved() {
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        Map<String, String> ipnParams = createMockIpnParams("00", "123456", "10000000");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("00", response.get("RspCode"));
        assertEquals("Confirm Success", response.get("Message"));
        assertEquals(OrderStatus.PAID, order.getStatus());
        assertEquals("123456", order.getVnpayTransId());
        verify(orderRepo).save(order);
    }

    @Test
    void processIpn_failedPayment_keepsOrderPendingForRetry() {
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        Map<String, String> ipnParams = createMockIpnParams("99", "123456", "10000000");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("00", response.get("RspCode"));
        assertEquals("Confirm Success", response.get("Message"));
        assertEquals(OrderStatus.PENDING, order.getStatus());
        verify(orderRepo, never()).save(order);
    }

    @Test
    void processIpn_invalidChecksum() {
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");

        Map<String, String> ipnParams = createMockIpnParams("00", "123456", "10000000");
        ipnParams.put("vnp_SecureHash", "wronghashvalue");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("97", response.get("RspCode"));
        assertEquals("Invalid Checksum", response.get("Message"));
        assertEquals(OrderStatus.PENDING, order.getStatus());
    }

    @Test
    void processIpn_orderNotFound() {
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(orderRepo.findById(10L)).thenReturn(Optional.empty());

        Map<String, String> ipnParams = createMockIpnParams("00", "123456", "10000000");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("01", response.get("RspCode"));
        assertEquals("Order not found", response.get("Message"));
    }

    @Test
    void processIpn_invalidAmount() {
        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        // Wrong amount 20000000 (200k VND) instead of 10000000 (100k VND)
        Map<String, String> ipnParams = createMockIpnParams("00", "123456", "20000000");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("04", response.get("RspCode"));
        assertEquals("Invalid Amount", response.get("Message"));
    }

    @Test
    void processIpn_orderAlreadyConfirmed() {
        order.setStatus(OrderStatus.PAID);

        when(vnPayConfig.getHashSecret()).thenReturn("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN");
        when(orderRepo.findById(10L)).thenReturn(Optional.of(order));

        Map<String, String> ipnParams = createMockIpnParams("00", "123456", "10000000");

        Map<String, String> response = vnPayService.processIpn(ipnParams);

        assertEquals("02", response.get("RspCode"));
        assertEquals("Order already confirmed", response.get("Message"));
    }

    private Map<String, String> createMockIpnParams(String responseCode, String transId, String amount) {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", "2QTY7D9E");
        params.put("vnp_Amount", amount);
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", "10");
        params.put("vnp_OrderInfo", "Thanh toan don hang 10");
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ResponseCode", responseCode);
        params.put("vnp_TransactionNo", transId);

        // Sign the params
        Map<String, String> sortedParams = new TreeMap<>(params);
        StringBuilder hashData = new StringBuilder();
        Iterator<Map.Entry<String, String>> itr = sortedParams.entrySet().iterator();
        while (itr.hasNext()) {
            Map.Entry<String, String> entry = itr.next();
            try {
                // Match the exact canonical form used by VnPayService when it
                // verifies an IPN signature. In particular, spaces stay as
                // '+' rather than being changed to '%20'.
                String key = URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII.toString());
                String val = URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII.toString());
                hashData.append(key).append('=').append(val);
            } catch (Exception e) {
                // Ignore
            }
            if (itr.hasNext()) {
                hashData.append('&');
            }
        }

        String secureHash = VnPayUtil.hmacSHA512("THXJZKIXZMTNKBVURWJPHZDRUDGLAEPN", hashData.toString());
        params.put("vnp_SecureHash", secureHash);

        return params;
    }
}
