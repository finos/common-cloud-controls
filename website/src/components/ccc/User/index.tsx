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
          <a href={`https://github.com/${githubId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {githubId}
          </a>
        </div>
        <Badge variant="secondary" className="w-fit">
          {company}
        </Badge>
      </div>
    </div>
  );
}
