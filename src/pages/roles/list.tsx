import { useGetLocale, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Outlet } from "react-router";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableFilterDropdownText } from "@/components/data-table/data-table-filter";
import { DataTableSorter } from "@/components/data-table/data-table-sorter";
import { ListView } from "@/components/resources/views/list-view";
import { Badge } from "@/components/ui/badge";
import { resolveRoleLabel } from "@/extensions/nocobase-users-example/role-utils";
import type { RoleRecord } from "@/extensions/nocobase-users-example/types";

export const RoleList = () => {
  const translate = useTranslate();
  const getLocale = useGetLocale();
  const locale = getLocale();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RoleRecord>();

    return [
      columnHelper.accessor("name", {
        id: "name",
        header: ({ column, table }) => (
          <div className="flex items-center gap-1">
            <span>
              {translate("roles.fields.name", { ns: "app" }, "Name")}
            </span>
            <DataTableSorter column={column} />
            <DataTableFilterDropdownText
              column={column}
              table={table}
              defaultOperator="contains"
              operators={["contains", "eq", "startswith", "endswith"]}
            />
          </div>
        ),
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: ({ column, table }) => (
          <div className="flex items-center gap-1">
            <span>
              {translate("roles.fields.title", { ns: "app" }, "Title")}
            </span>
            <DataTableSorter column={column} />
            <DataTableFilterDropdownText
              column={column}
              table={table}
              defaultOperator="contains"
              operators={["contains", "eq", "startswith", "endswith"]}
            />
          </div>
        ),
        enableSorting: true,
        cell: ({ row }) => resolveRoleLabel(row.original) || "-",
      }),
      columnHelper.accessor("description", {
        id: "description",
        header: () => (
          <span>
            {translate("roles.fields.description", { ns: "app" }, "Description")}
          </span>
        ),
        enableSorting: false,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("default", {
        id: "default",
        header: () => (
          <span>
            {translate("roles.fields.default", { ns: "app" }, "Default role")}
          </span>
        ),
        enableSorting: true,
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="secondary">
              {translate("common.yes", { ns: "app" }, "Yes")}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              {translate("common.no", { ns: "app" }, "No")}
            </span>
          ),
      }),
      columnHelper.accessor("hidden", {
        id: "hidden",
        header: () => (
          <span>
            {translate("roles.fields.hidden", { ns: "app" }, "Hidden")}
          </span>
        ),
        enableSorting: true,
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="outline">
              {translate("common.yes", { ns: "app" }, "Yes")}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              {translate("common.no", { ns: "app" }, "No")}
            </span>
          ),
      }),
      columnHelper.accessor("allowConfigure", {
        id: "allowConfigure",
        header: () => (
          <span>
            {translate(
              "roles.fields.allowConfigure",
              { ns: "app" },
              "Can configure"
            )}
          </span>
        ),
        enableSorting: true,
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="secondary">
              {translate("common.yes", { ns: "app" }, "Yes")}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              {translate("common.no", { ns: "app" }, "No")}
            </span>
          ),
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <span>
              {translate(
                "roles.fields.createdAt",
                { ns: "app" },
                "Created at"
              )}
            </span>
            <DataTableSorter column={column} />
          </div>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return value
            ? new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(value))
            : "-";
        },
      }),
    ];
  }, [locale, translate]);

  const table = useTable<RoleRecord>({
    columns,
    refineCoreProps: {
      resource: "roles",
      syncWithLocation: false,
      sorters: {
        initial: [{ field: "createdAt", order: "desc" }],
      },
    },
  });

  return (
    <ListView resource="roles">
      <DataTable table={table} />
      <Outlet />
    </ListView>
  );
};

export default function RoleListRoute() {
  return (
    <CanAccess resource="roles" action="list" fallback={<AccessDenied />}>
      <RoleList />
    </CanAccess>
  );
}
