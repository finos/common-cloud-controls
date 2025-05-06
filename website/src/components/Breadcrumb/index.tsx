import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

const Breadcrumb = () => {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-sm text-gray-500 mb-4 mx-32 py-5">
      <Link to="/" className="hover:underline text-blue-600">
        Home
      </Link>
      {pathParts.map((part, index) => {
        const to = "/" + pathParts.slice(0, index + 1).join("/");
        const isLastPart = index === pathParts.length - 1;
        return (
          <span key={to}>
            {" / "}
            <Link to={to} className={` ${isLastPart ? "font-medium text-gray-700" : "text-blue-600"}`}>
              {part}
            </Link>
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
