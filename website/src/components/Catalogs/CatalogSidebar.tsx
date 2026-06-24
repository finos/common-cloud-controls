import React from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";
import "./CatalogSidebar.css";

interface Service {
  slug: string;
  label: string;
  href?: string; // optional override for the generated /catalogs/<cat>/<svc> path
}

interface Category {
  slug: string;
  label: string;
  services: Service[];
}

export const CATALOG_STRUCTURE: Category[] = [
  { slug: "ai-ml",      label: "AI/ML",       services: [
    { slug: "gen-ai",              label: "Gen AI" },
    { slug: "mlde",                label: "MLDE" },
    { slug: "multi-agent-refarch", label: "Multi-Agent Ref Arch" },
  ]},
  { slug: "compute",    label: "Compute",     services: [
    { slug: "batchproc",             label: "Batch Processing" },
    { slug: "serverless-computing",  label: "Serverless Computing" },
    { slug: "virtual-machines",      label: "Virtual Machines" },
  ]},
  { slug: "core",       label: "Core",        services: [
    { slug: "ccc", label: "CCC", href: "/catalogs/core" },
  ]},
  { slug: "crypto",     label: "Crypto",      services: [
    { slug: "key",     label: "Key" },
    { slug: "secrets", label: "Secrets" },
  ]},
  { slug: "database",   label: "Database",    services: [
    { slug: "relational", label: "Relational" },
    { slug: "vector",     label: "Vector" },
    { slug: "warehouse",  label: "Warehouse" },
  ]},
  { slug: "devtools",   label: "DevTools",    services: [
    { slug: "build",              label: "Build" },
    { slug: "container-registry", label: "Container Registry" },
  ]},
  { slug: "identity",   label: "Identity",    services: [
    { slug: "iam", label: "IAM" },
  ]},
  { slug: "management", label: "Management",  services: [
    { slug: "auditlog",  label: "Audit Log" },
    { slug: "logging",   label: "Logging" },
    { slug: "monitoring",label: "Monitoring" },
    { slug: "tracing",   label: "Tracing" },
  ]},
  { slug: "app-integration", label: "App Integration", services: [
    { slug: "message", label: "Messaging" },
  ]},
  { slug: "networking", label: "Networking",  services: [
    { slug: "loadbalancer", label: "Load Balancer" },
    { slug: "vpc",          label: "VPC" },
  ]},
  { slug: "orchestration", label: "Orchestration", services: [
    { slug: "etl", label: "ETL" },
    { slug: "k8s", label: "Kubernetes" },
  ]},
  { slug: "storage",    label: "Storage",     services: [
    { slug: "object", label: "Object" },
  ]},
];

const TYPE_TITLE: Record<string, string> = {
  capabilities: "Capabilities",
  threats: "Threats",
  controls: "Controls",
};

interface CatalogSidebarProps {
  // When provided, filter to only these services and show a type heading
  typeIndexData?: CatalogTypeIndexData;
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = ({ typeIndexData }) => {
  const { pathname } = useLocation();

  const typeLinkMap = typeIndexData
    ? new Map(typeIndexData.serviceEntries.map((e) => [`${e.category}/${e.service}`, e.typePath]))
    : null;

  const title = typeIndexData
    ? (TYPE_TITLE[typeIndexData.type] ?? typeIndexData.type.charAt(0).toUpperCase() + typeIndexData.type.slice(1))
    : null;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="catalog-sidebar">
      {title && <div className="catalog-sidebar-type-title">{title}</div>}
      {CATALOG_STRUCTURE.map(({ slug, label, services }) => {
        // When filtering, only show services that have the type
        const visibleServices = typeLinkMap
          ? services.filter((svc) => typeLinkMap.has(`${slug}/${svc.slug}`))
          : services;

        if (visibleServices.length === 0) return null;

        const categoryActive = visibleServices.some(({ slug: svc, href }) => {
          const path = typeLinkMap?.get(`${slug}/${svc}`) ?? href ?? `/catalogs/${slug}/${svc}`;
          return isActive(path);
        });

        return (
          <details key={slug} open={categoryActive}>
            <summary className={categoryActive ? "category-active" : ""}>
              <span>{label}</span>
              <span className="chevron">▾</span>
            </summary>
            <div className="service-links">
              {visibleServices.map(({ slug: svcSlug, label: svcLabel, href }) => {
                const path =
                  typeLinkMap?.get(`${slug}/${svcSlug}`) ??
                  href ??
                  `/catalogs/${slug}/${svcSlug}`;
                return (
                  <Link
                    key={svcSlug}
                    to={path}
                    className={`sidebar-service-link${isActive(path) ? " active" : ""}`}
                  >
                    {svcLabel}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
};
