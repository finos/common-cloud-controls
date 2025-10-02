import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Contributor } from "@site/src/types/ccc";

interface UserProps {
  contributor: Contributor;
}

export function User({ contributor }: UserProps) {
  const { name, "github-id": githubId, company } = contributor;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const hasGitHubId = githubId && githubId.trim() !== "";

  return (
    <div className="flex items-center gap-4">
      <Avatar>{hasGitHubId ? <AvatarImage src={`https://github.com/${githubId}.png`} alt={name} /> : <AvatarFallback className="bg-gray-400 text-white font-medium">{initials}</AvatarFallback>}</Avatar>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {hasGitHubId ? (
            <a href={`https://github.com/${githubId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
              @{githubId}
            </a>
          ) : null}
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300 w-fit">
          {company}
        </Badge>
      </div>
    </div>
  );
}
