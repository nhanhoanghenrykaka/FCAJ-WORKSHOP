FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml ./
COPY src/ ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S shopsflow && adduser -S shopsflow -G shopsflow
COPY --from=builder /app/target/*.jar app.jar
RUN mkdir -p /app/uploads && chown -R shopsflow:shopsflow app.jar /app/uploads
USER shopsflow
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
