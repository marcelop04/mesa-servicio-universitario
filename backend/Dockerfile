# Backend Spring Boot: compila con Maven y ejecuta con un JRE liviano.
# El JAR es portable: compilar en la arquitectura nativa evita Maven bajo QEMU.
FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl tar \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 msu && mkdir -p /app/archivos && chown msu /app/archivos
COPY --from=build /app/target/msu-backend-*.jar app.jar
USER msu
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
