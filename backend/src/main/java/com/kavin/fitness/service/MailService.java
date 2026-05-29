package com.kavin.fitness.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@progresslog.local}")
    private String fromAddress;

    public void send(String to, String subject, String body) {
        if (mailSender == null) {
            log.warn("MailService: no SMTP configured — logging email instead.\n" +
                    "  To: {}\n  Subject: {}\n  Body:\n{}", to, subject, body);
            return;
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(body);
        mailSender.send(msg);
        log.info("MailService: sent email to {} (subject='{}')", to, subject);
    }
}
