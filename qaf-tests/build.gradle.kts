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

    // QAF 4.0.0-RC3's POM declares TestNG 6.10 (stale), but its bytecode calls TestNG 7.x
    // internal APIs. Pin to 7.5.0 — new enough for QAF's runtime, old enough that
    // TestRunner's constructor hasn't been removed yet (broken in 7.7+).
    testImplementation("org.testng:testng:7.6.1")

    // Logging
    testImplementation("org.slf4j:slf4j-api:2.0.12")
    testImplementation("ch.qos.logback:logback-classic:1.5.3")
}

tasks.withType<Test> {
    useTestNG {
        suites("src/test/resources/testng-config.xml")
    }
    systemProperty("application.properties.file", "src/test/resources/application.properties")

    addTestListener(object : TestListener {
        override fun beforeSuite(suite: TestDescriptor) {}
        override fun beforeTest(testDescriptor: TestDescriptor) {}
        override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
        override fun afterSuite(suite: TestDescriptor, result: TestResult) {
            if (suite.parent == null && result.testCount == 0L) {
                throw GradleException("No tests were executed — check BDDTestFactory/scenario.file.loc configuration.")
            }
        }
    })

    // Propagate selected -D system properties from the gradle invocation through to the JVM
    // running the tests. This lets CI override credentials and base URL via secrets.
    listOf(
        "env.baseurl",
        "test.user.username",
        "test.user.password",
        "driver.name",
        "driver.additional.capabilities"
    ).forEach { key ->
        System.getProperty(key)?.let { systemProperty(key, it) }
    }
}
