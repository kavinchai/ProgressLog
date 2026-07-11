plugins {
    java
    id("org.springframework.boot") version "3.2.3"
    id("io.spring.dependency-management") version "1.1.4"
    id("com.diffplug.spotless") version "6.25.0"
}

group   = "com.kavin.fitness"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Flyway + PostgreSQL
    // Note: flyway-database-postgresql is a Flyway 10.x module.
    // Spring Boot 3.2.x ships Flyway 9.x, which includes PostgreSQL support in flyway-core.
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.postgresql:postgresql")

    // JWT (jjwt 0.12.x)
    implementation("io.jsonwebtoken:jjwt-api:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.3")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

spotless {
    java {
        target("src/**/*.java")
        googleJavaFormat("1.22.0").aosp()
        importOrder()
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
}

tasks.named("check") {
    dependsOn("spotlessCheck")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Byte Buddy (used by Mockito to mock concrete classes) lags the JDK release cadence.
    // The experimental flag lets it run on JDKs newer than the version it officially supports.
    systemProperty("net.bytebuddy.experimental", "true")
}
