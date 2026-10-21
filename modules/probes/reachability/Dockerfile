FROM golang:1.25-alpine AS build
WORKDIR /src
COPY modules/cloud-api/go.mod /src/modules/cloud-api/go.mod
COPY modules/cloud-api/go.sum /src/modules/cloud-api/go.sum
COPY modules/cloud-api/types /src/modules/cloud-api/types
COPY modules/cloud-api/reachability /src/modules/cloud-api/reachability
COPY modules/probes/reachability/go.mod /src/modules/probes/reachability/go.mod
COPY modules/probes/reachability/*.go /src/modules/probes/reachability/
WORKDIR /src/modules/probes/reachability
# Always emit linux/amd64 for cloud nodes (hosts may be arm64).
RUN go mod edit -replace github.com/finos/common-cloud-controls/cloud-api=../../cloud-api \
    && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /reachability-probe .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /reachability-probe /reachability-probe
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/reachability-probe"]
