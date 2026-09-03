FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /admission-webhook-probe .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /admission-webhook-probe /admission-webhook-probe
USER nonroot:nonroot
EXPOSE 8443
ENTRYPOINT ["/admission-webhook-probe"]
