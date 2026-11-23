-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'LEAVING');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'SALARY_CHANGED');

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayBand" (
    "id" SERIAL NOT NULL,
    "levelId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "minAmount" DECIMAL(14,2) NOT NULL,
    "maxAmount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PayBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" SERIAL NOT NULL,
    "fromCurrency" CHAR(3) NOT NULL,
    "toCurrency" CHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "rateDate" DATE NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Level_rank_key" ON "Level"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_countryId_idx" ON "Employee"("countryId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_levelId_idx" ON "Employee"("levelId");

-- CreateIndex
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "SalaryRecord_employeeId_effectiveFrom_idx" ON "SalaryRecord"("employeeId", "effectiveFrom" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SalaryRecord_employeeId_effectiveFrom_key" ON "SalaryRecord"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PayBand_levelId_countryId_key" ON "PayBand"("levelId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_fromCurrency_toCurrency_rateDate_key" ON "FxRate"("fromCurrency", "toCurrency", "rateDate");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_createdAt_idx" ON "AuditLog"("employeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayBand" ADD CONSTRAINT "PayBand_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayBand" ADD CONSTRAINT "PayBand_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
