import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";

interface UserProps {
  name: string;
  githubId: string;
  company: string;
  avatarUrl?: string;
}

export function User({ name, githubId, company, avatarUrl }: UserProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <Avatar>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          <a href={`https://github.com/${githubId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
            {githubId}
          </a>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800 font-medium border border-blue-300 w-fit">
          {company}
        </Badge>
      </div>
    </div>
  );
}
