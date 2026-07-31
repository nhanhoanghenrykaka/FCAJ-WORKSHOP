package dev.namphamcse.shopsflow.service;

import dev.namphamcse.shopsflow.config.VnPayConfig;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.util.VnPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnPayService {

    private final OrderRepository orderRepo;
    private final VnPayConfig vnPayConfig;
    private final NotificationService notificationService;
    private final OrderHistoryService orderHistoryService;
    private final AuditService auditService;

    @Transactional
    public String createPaymentLink(Long orderId, User user, HttpServletRequest request) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new BusinessRuleViolationException("Order does not belong to user: " + orderId);
        }

        if (order.getVnpayTransId() != null && !order.getVnpayTransId().isBlank()) {
            throw new BusinessRuleViolationException("This order has already been paid and cannot be paid again: " + orderId);
        }
        if (order.getReturnReason() != null && !order.getReturnReason().isBlank()) {
            throw new BusinessRuleViolationException("This order entered the return/refund workflow and cannot be paid again: " + orderId);
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessRuleViolationException("Order is not pending: " + orderId);
        }

        validateCheckoutConfiguration();

        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_TxnRef = String.valueOf(order.getId());
        String vnp_IpAddr = VnPayUtil.getIpAddress(request);
        String vnp_TmnCode = vnPayConfig.getTmnCode();

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);

        // The storefront stores prices in USD, while VNPay accepts VND only.
        // Convert using the configured fixed demo/business rate, then multiply by 100
        // because VNPay represents VND amounts in hundredths in the request.
        BigDecimal amountVnd = toVnd(order.getTotalAmount());
        BigDecimal amount = amountVnd.multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP);
        vnp_Params.put("vnp_Amount", amount.toPlainString());
        vnp_Params.put("vnp_CurrCode", "VND");

        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang " + vnp_TxnRef);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        ZonedDateTime createdDate = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String vnp_CreateDate = createdDate.format(formatter);
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        String vnp_ExpireDate = createdDate.plusMinutes(15).format(formatter);
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                try {
                    String encField = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString());
                    String encValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString());

                    hashData.append(encField).append('=').append(encValue);
                    query.append(encField).append('=').append(encValue);
                } catch (UnsupportedEncodingException e) {
                    throw new RuntimeException("Encoding failure", e);
                }
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String queryUrl = query.toString();
        String vnp_SecureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret().trim(), hashData.toString());
        String paymentUrl = vnPayConfig.getApiUrl() + "?" + queryUrl + "&vnp_SecureHash=" + vnp_SecureHash;

        notificationService.notifyUser(
                user, user, NotificationType.PAYMENT,
                "VNPay checkout started",
                "You started VNPay checkout for order #" + order.getId() + ".",
                "/orders");

        return paymentUrl;
    }

    @Transactional
    public Map<String, String> processIpn(Map<String, String> params) {
        return processGatewayResult(params);
    }

    @Transactional
    public Map<String, String> processReturn(Map<String, String> params) {
        // VNPay cannot call an IPN URL hosted only on localhost. The browser return
        // still contains a signed VNPay payload, so local Docker development can
        // securely reconcile it here after verifying the checksum and amount.
        return processGatewayResult(params);
    }

    private Map<String, String> processGatewayResult(Map<String, String> params) {
        String hashSecret = vnPayConfig.getHashSecret();
        if (isBlank(hashSecret)) {
            return Map.of("RspCode", "99", "Message", "Payment gateway is not configured");
        }

        String vnp_SecureHash = params.get("vnp_SecureHash");

        // Verify Signature
        Map<String, String> sortedParams = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue();
            if (key.startsWith("vnp_") && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                sortedParams.put(key, val);
            }
        }

        StringBuilder hashData = new StringBuilder();
        Iterator<Map.Entry<String, String>> itr = sortedParams.entrySet().iterator();
        while (itr.hasNext()) {
            Map.Entry<String, String> entry = itr.next();
            try {
                hashData.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII.toString()));
                hashData.append('=');
                hashData.append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII.toString()));
            } catch (UnsupportedEncodingException e) {
                // Ignore
            }
            if (itr.hasNext()) {
                hashData.append('&');
            }
        }

        String calculatedHash = VnPayUtil.hmacSHA512(hashSecret.trim(), hashData.toString());
        if (!calculatedHash.equalsIgnoreCase(vnp_SecureHash)) {
            return Map.of("RspCode", "97", "Message", "Invalid Checksum");
        }

        // Find Order
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) {
            return Map.of("RspCode", "01", "Message", "Order not found");
        }
        Long orderId;
        try {
            orderId = Long.parseLong(txnRef);
        } catch (NumberFormatException e) {
            return Map.of("RspCode", "01", "Message", "Order not found");
        }

        Order order = orderRepo.findById(orderId).orElse(null);
        if (order == null) {
            return Map.of("RspCode", "01", "Message", "Order not found");
        }

        // Verify Amount
        String amountStr = params.get("vnp_Amount");
        if (amountStr == null) {
            return Map.of("RspCode", "04", "Message", "Invalid Amount");
        }
        BigDecimal vnpAmount;
        try {
            vnpAmount = new BigDecimal(amountStr).divide(new BigDecimal("100"), 0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException | NumberFormatException ex) {
            return Map.of("RspCode", "04", "Message", "Invalid Amount");
        }
        BigDecimal expectedAmountVnd = toVnd(order.getTotalAmount());
        if (expectedAmountVnd.compareTo(vnpAmount) != 0) {
            return Map.of("RspCode", "04", "Message", "Invalid Amount");
        }

        // Never accept a second payment for an order that has already completed
        // a successful VNPay payment or entered the return/refund workflow, even
        // if stale/legacy data incorrectly reports the status as PENDING.
        if ((order.getVnpayTransId() != null && !order.getVnpayTransId().isBlank())
                || (order.getReturnReason() != null && !order.getReturnReason().isBlank())) {
            return Map.of("RspCode", "02", "Message", "Order is no longer payable");
        }

        // Verify Order status is PENDING
        if (order.getStatus() != OrderStatus.PENDING) {
            return Map.of("RspCode", "02", "Message", "Order already confirmed");
        }

        // Process status
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String transactionNo = params.get("vnp_TransactionNo");
        boolean successful = "00".equals(responseCode)
                && (transactionStatus == null || "00".equals(transactionStatus));
        if (successful) {
            order.setStatus(OrderStatus.PAID);
            order.setVnpayTransId(transactionNo);
            orderRepo.save(order);
            orderHistoryService.record(order, OrderStatus.PENDING, OrderStatus.PAID, null, "VNPay payment confirmed");
            auditService.log(null, "PAYMENT_CONFIRMED", "ORDER", order.getId(), "VNPay transaction " + transactionNo);

            notificationService.notifyUserFromSystem(
                    order.getUser(), "VNPay", NotificationType.PAYMENT,
                    "Payment confirmed for order #" + order.getId(),
                    "VNPay confirmed your payment. The order is now PAID.",
                    "/orders/" + order.getId());
            notificationService.notifyRoleFromSystem(
                    Role.ADMIN, "VNPay", NotificationType.PAYMENT,
                    "Order #" + order.getId() + " paid",
                    order.getUser().getName() + " completed VNPay payment. The order is now PAID.",
                    "/admin");
        } else {
            // Keep the order PENDING so the customer can retry payment instead of
            // creating duplicate orders. Reserved stock stays attached to this order
            // until payment succeeds or an admin cancels it.
            notificationService.notifyUserFromSystem(
                    order.getUser(), "VNPay", NotificationType.PAYMENT,
                    "Payment not completed for order #" + order.getId(),
                    "VNPay did not confirm the payment. The order is still PENDING and you can try again.",
                    "/orders/" + order.getId());
            notificationService.notifyRoleFromSystem(
                    Role.ADMIN, "VNPay", NotificationType.PAYMENT,
                    "Payment pending for order #" + order.getId(),
                    order.getUser().getName() + " did not complete VNPay payment. The order remains PENDING.",
                    "/admin");
        }

        return Map.of("RspCode", "00", "Message", "Confirm Success");
    }
    private void validateCheckoutConfiguration() {
        if (isBlank(vnPayConfig.getTmnCode())
                || isBlank(vnPayConfig.getHashSecret())
                || isBlank(vnPayConfig.getReturnUrl())) {
            throw new BusinessRuleViolationException(
                    "VNPay is not configured. Set VNPAY_TMN_CODE, VNPAY_HASH_SECRET and VNPAY_RETURN_URL.");
        }
        if (vnPayConfig.getUsdToVndRate() == null || vnPayConfig.getUsdToVndRate().signum() <= 0) {
            throw new BusinessRuleViolationException(
                    "VNPay conversion rate is invalid. Set VNPAY_USD_TO_VND_RATE to a positive number.");
        }
    }

    private BigDecimal toVnd(BigDecimal storeAmountUsd) {
        BigDecimal rate = vnPayConfig.getUsdToVndRate();
        if (rate == null || rate.signum() <= 0) {
            throw new BusinessRuleViolationException("VNPay USD to VND conversion rate is not configured.");
        }
        return storeAmountUsd.multiply(rate).setScale(0, RoundingMode.HALF_UP);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

}
