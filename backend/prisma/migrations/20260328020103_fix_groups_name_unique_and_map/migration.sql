/*
  Warnings:

  - You are about to drop the `ModulePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGroupMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ModulePermission" DROP CONSTRAINT "ModulePermission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_projectId_fkey";

-- DropForeignKey
ALTER TABLE "UserGroupMember" DROP CONSTRAINT "UserGroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "UserGroupMember" DROP CONSTRAINT "UserGroupMember_userId_fkey";

-- DropTable
DROP TABLE "ModulePermission";

-- DropTable
DROP TABLE "UserGroup";

-- DropTable
DROP TABLE "UserGroupMember";

-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_members" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_members_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "module_permissions" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "module" "ModuleType" NOT NULL,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_name_projectId_key" ON "user_groups"("name", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "module_permissions_groupId_module_key" ON "module_permissions"("groupId", "module");

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
