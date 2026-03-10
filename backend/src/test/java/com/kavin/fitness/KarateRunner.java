package com.kavin.fitness;

import com.intuit.karate.junit5.Karate;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DirtiesContext
class KarateRunner {

    @LocalServerPort
    int port;

    @Test
    void runKarate() {
        var results = Karate.run("classpath:karate")
                .systemProperty("server.port", String.valueOf(port))
                .parallel(1);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }
}
