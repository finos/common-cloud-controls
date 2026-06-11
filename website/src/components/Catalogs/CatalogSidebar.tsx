import React from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import "./CatalogSidebar.css";

interface Service {
  slug: string;
  label: string;
}

interface Category {
  slug: string;
  label: string;
  services: Service[];
}

const CATALOG_STRUCTURE: Category[] = [
  { slug: "ai-ml",      label: "AI/ML",       services: [
    { slug: "gen-ai", label: "Gen AI" },
    { slug: "mlde",   label: "MLDE" },
  ]},
  { slug: "compute",    label: "Compute",     services: [
    { slug: "batchproc",             label: "Batch Processing" },
    { slug: "serverless-computing",  label: "Serverless Computing" },
    { slug: "virtual-machines",      label: "Virtual Machines" },
  ]},
  { slug: "core",       label: "Core",        services: [
    { slug: "ccc", label: "CCC" },
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
  { slug: "networking", label: "Networking",  services: [
    { slug: "loadbalancer", label: "Load Balancer" },
    { slug: "vpc",          label: "VPC" },
  ]},
  { slug: "storage",    label: "Storage",     services: [
    { slug: "object", label: "Object" },
  ]},
];

interface CatalogSidebarProps {
  typeFilter?: string;
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = () => {
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="catalog-sidebar">
      {CATALOG_STRUCTURE.map(({ slug, label, services }) => {
        const categoryActive = services.some(({ slug: svc }) =>
          isActive(`/catalogs/${slug}/${svc}`)
        );

        return (
          <details key={slug} open={categoryActive}>
            <summary className={categoryActive ? "category-active" : ""}>
              <span>{label}</span>
              <span className="chevron">▾</span>
            </summary>
            <div className="service-links">
              {services.map(({ slug: svcSlug, label: svcLabel }) => {
                const path = `/catalogs/${slug}/${svcSlug}`;
                return (
                  <Link
                    key={path}
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
