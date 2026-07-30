FROM golang:1.25-alpine AS build
WORKDIR /src
COPY modules/cloud-api/go.mod /src/modules/cloud-api/go.mod
COPY modules/cloud-api/reachability /src/modules/cloud-api/reachability
COPY modules/reachability-probe/go.mod /src/modules/reachability-probe/go.mod
COPY modules/reachability-probe/*.go /src/modules/reachability-probe/
WORKDIR /src/modules/reachability-probe
RUN go mod edit -replace github.com/finos/common-cloud-controls/cloud-api=../cloud-api \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /reachability-probe .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /reachability-probe /reachability-probe
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/reachability-probe"]
