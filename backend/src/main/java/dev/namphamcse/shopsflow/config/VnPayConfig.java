package dev.namphamcse.shopsflow.config;

import java.math.BigDecimal;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class VnPayConfig {

    @Value("${vnpay.api-url}")
    private String apiUrl;

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    @Value("${vnpay.return-url}")
    private String returnUrl;

    @Value("${vnpay.ipn-url}")
    private String ipnUrl;

    @Value("${vnpay.usd-to-vnd-rate:25000}")
    private BigDecimal usdToVndRate;
}
