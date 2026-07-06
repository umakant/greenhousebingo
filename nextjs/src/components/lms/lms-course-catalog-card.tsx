"use client";

import Link from "next/link";
import { BookOpen, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";
import { getImagePath } from "@/utils/image-path";

export type LmsCourseCatalogCardCourse = {
  id: string;
  title: string;
  status: string;
  deliveryType: string;
  isPublic: boolean;
  coverImageUrl?: string | null;
  category: { name: string } | null;
  enrollmentCount: number;
};

function formatDeliveryType(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatus(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const u = status.toUpperCase();
  if (u === "PUBLISHED") return "default";
  if (u === "DRAFT") return "secondary";
  if (u === "ARCHIVED") return "outline";
  return "secondary";
}

function CourseCover(props: { title: string; coverImageUrl?: string | null }) {
  const src = props.coverImageUrl?.trim() ? getImagePath(props.coverImageUrl.trim()) : "";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-muted-foreground">
      <BookOpen className="h-10 w-10 opacity-40" aria-hidden />
    </div>
  );
}

export function LmsCourseCatalogCard(props: {
  course: LmsCourseCatalogCardCourse;
  canManage: boolean;
  onEdit: () => void;
  actionItems: TableActionItem[];
  className?: string;
}) {
  const { course, canManage, onEdit, actionItems, className } = props;

  const titleNode = canManage ? (
    <button type="button" className="line-clamp-2 text-left text-base font-semibold leading-snug hover:text-primary" onClick={onEdit}>
      {course.title}
    </button>
  ) : (
    <Link href={`/lms/courses/${course.id}`} className="line-clamp-2 text-base font-semibold leading-snug hover:text-primary">
      {course.title}
    </Link>
  );

  return (
    <Card className={cn("group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md", className)}>
      <div className="relative aspect-[16/10] bg-muted">
        <CourseCover title={course.title} coverImageUrl={course.coverImageUrl} />
        <Badge className="absolute left-3 top-3 capitalize" variant={statusVariant(course.status)}>
          {formatStatus(course.status)}
        </Badge>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        {titleNode}
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {formatDeliveryType(course.deliveryType)}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {course.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        {course.category?.name ? (
          <p className="text-sm text-muted-foreground line-clamp-1">{course.category.name}</p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
          {course.enrollmentCount} enrolled
        </span>
        {canManage ? (
          <TableActionButton label="Edit" onPrimaryClick={onEdit} items={actionItems} />
        ) : (
          <Link href={`/lms/courses/${course.id}`} className="text-sm font-medium text-primary hover:underline">
            View
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
