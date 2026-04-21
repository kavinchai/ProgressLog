plugins {
    java
}

group = "com.kavin.fitness"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    // QAF (Quality Automation Framework)
    testImplementation("com.qmetry:qaf:4.0.0-RC3")
    testImplementation("com.qmetry:qaf-support:4.0.0-RC3")

    // Selenium WebDriver
    testImplementation("org.seleniumhq.selenium:selenium-java:4.18.1")

    // WebDriverManager for automatic driver management
    testImplementation("io.github.bonigarcia:webdrivermanager:5.7.0")

    // TestNG (QAF is built on TestNG)
    testImplementation("org.testng:testng:7.9.0")

    // Logging
    testImplementation("org.slf4j:slf4j-api:2.0.12")
    testImplementation("ch.qos.logback:logback-classic:1.5.3")
}

tasks.withType<Test> {
    useTestNG {
        suites("src/test/resources/testng-config.xml")
    }
    systemProperty("application.properties.file", "src/test/resources/application.properties")
}
