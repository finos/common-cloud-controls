import React from "react";
import type { Components } from "react-markdown";
import { isExternal } from "../utils";

export const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      {...(isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
    </a>
  )
};
