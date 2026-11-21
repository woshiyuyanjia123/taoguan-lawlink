-- AlterTable
ALTER TABLE "User" ADD COLUMN     "barLicenseNo" TEXT,
ADD COLUMN     "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME_LAWYER',
ADD COLUMN     "offboardAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officeId" TEXT,
ADD COLUMN     "publicCardBio" TEXT,
ADD COLUMN     "publicCardSpecialties" TEXT;

-- CreateTable
CREATE TABLE "tg_office" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "caseNoPrefix" TEXT NOT NULL DEFAULT 'TG',
    "managementFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "peerTransferFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "invoiceAlertDays" INTEGER NOT NULL DEFAULT 30,
    "letterAlertLimit" INTEGER NOT NULL DEFAULT 10,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "isCommittee" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clonedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_emergency_pause" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pausedById" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumedById" TEXT,
    "resumedAt" TIMESTAMP(3),

    CONSTRAINT "tg_emergency_pause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_personal_party_pool" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL DEFAULT 'NATURAL',
    "name" TEXT NOT NULL,
    "idNumber" TEXT,
    "phone" TEXT,
    "invoiceTitle" TEXT,
    "taxNo" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_personal_party_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_criminal_intake_profile" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT,
    "officeId" TEXT,
    "caseTitle" TEXT NOT NULL,
    "isProxyFiling" BOOLEAN NOT NULL DEFAULT false,
    "leadLawyerId" TEXT,
    "leadTakeoverStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "sourceLawyerId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientIdNo" TEXT,
    "clientIsSuspect" BOOLEAN NOT NULL DEFAULT false,
    "clientSuspectRelation" TEXT,
    "suspectsJson" JSONB NOT NULL,
    "victimsJson" JSONB,
    "chargesJson" JSONB NOT NULL,
    "coerciveMeasure" TEXT,
    "coerciveAuthorityRegion" TEXT,
    "coerciveAuthorityName" TEXT,
    "handlingAuthorityRegion" TEXT,
    "handlingAuthorityName" TEXT,
    "entrustStageSummary" TEXT,
    "feeMode" INTEGER NOT NULL DEFAULT 1,
    "feeSubOption" TEXT,
    "selectedStagesJson" JSONB NOT NULL,
    "feeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "feeAmountChinese" TEXT,
    "meetingUnitPrice" DECIMAL(14,2),
    "meetingCount" INTEGER,
    "incidentalCivil" BOOLEAN NOT NULL DEFAULT false,
    "incidentalCivilFee" DECIMAL(14,2),
    "feeRemark" TEXT,
    "isForeignRelated" BOOLEAN NOT NULL DEFAULT false,
    "isGangRelated" BOOLEAN NOT NULL DEFAULT false,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "signingPath" TEXT NOT NULL DEFAULT 'CLIENT_FIRST',
    "workflowStep" TEXT NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "formalCaseNo" TEXT,
    "originalVerifiedAt" TIMESTAMP(3),
    "originalVerifiedById" TEXT,
    "draftExpiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_criminal_intake_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_conflict_resolution_case" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "intakeId" TEXT,
    "criminalProfileId" TEXT,
    "caseTitle" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'AUTO_HIT_CONTINUE',
    "status" TEXT NOT NULL DEFAULT 'PRIMARY_REVIEW',
    "hitKeywords" TEXT NOT NULL,
    "hitSummaryJson" JSONB NOT NULL,
    "applicantNote" TEXT,
    "primaryOpinion" TEXT,
    "primaryReviewerId" TEXT,
    "committeeDecision" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_conflict_resolution_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_conflict_resolution_message" (
    "id" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRoleLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_conflict_resolution_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_bank_statement_batch" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_bank_statement_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_bank_statement_entry" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "txDate" TIMESTAMP(3) NOT NULL,
    "payerName" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "allocatedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "memo" TEXT,
    "bankRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_bank_statement_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_bank_statement_allocation" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "officeId" TEXT,
    "matterId" TEXT,
    "caseNoLabel" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "matchMode" TEXT NOT NULL DEFAULT 'FULL',
    "amount" DECIMAL(14,2) NOT NULL,
    "managementFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "managementFeeAmount" DECIMAL(14,2) NOT NULL,
    "splitNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_LAWYER_CONFIRM',
    "lawyerComment" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "pushedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_bank_statement_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_internal_ledger_entry" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "userId" TEXT,
    "tableCode" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "tg_internal_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_finance_batch_c" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "preparedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_finance_batch_c_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_finance_batch_c_row" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "c1Salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c2Pension" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c3Medical" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c4Unemployment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c5Critical" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c6Maternity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c7Injury" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c8HousingFund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c9Reimbursement" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c10PersonalOutPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "c11PersonalTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "tg_finance_batch_c_row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_finance_batch_d" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "preparedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_finance_batch_d_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_finance_batch_d_row" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetName" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "payeeName" TEXT,
    "reason" TEXT,

    CONSTRAINT "tg_finance_batch_d_row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_peer_transfer" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "surchargeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "surchargeAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "memo" TEXT,
    "confirmMemo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RECEIVER',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_peer_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_finance_personal_request" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "payeeInfo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_finance_personal_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_invoice_portal_link" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "officeId" TEXT,
    "invoiceRequestId" TEXT,
    "matterId" TEXT,
    "caseNoLabel" TEXT,
    "lawyerId" TEXT NOT NULL,
    "invoiceCategory" TEXT NOT NULL DEFAULT 'A_CONFIRMED',
    "invoiceType" TEXT NOT NULL DEFAULT 'ELECTRONIC_NORMAL',
    "amount" DECIMAL(14,2) NOT NULL,
    "clientTitle" TEXT NOT NULL,
    "taxNo" TEXT,
    "clientAddressPhone" TEXT,
    "clientBankAccount" TEXT,
    "applicantEmail" TEXT,
    "remark" TEXT,
    "specialNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3),
    "scanUploaded" BOOLEAN NOT NULL DEFAULT false,
    "scanFileName" TEXT,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_invoice_portal_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_firm_policy_document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "category" TEXT NOT NULL DEFAULT 'FIRM_RULE',
    "content" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tg_firm_policy_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_policy_ack_record" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "watermarkCode" TEXT NOT NULL,
    "ackAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_policy_ack_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_hr_lifecycle_record" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "userId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME_LAWYER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "archiveNo" TEXT,
    "summary" TEXT NOT NULL,
    "detailsJson" JSONB,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_hr_lifecycle_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_admin_workflow_request" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "applicantId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "counterparty" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tg_admin_workflow_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_electronic_certificate" (
    "id" TEXT NOT NULL,
    "certNo" TEXT NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "officeId" TEXT,
    "matterId" TEXT,
    "caseNoLabel" TEXT NOT NULL,
    "certType" TEXT NOT NULL,
    "recipientOrg" TEXT NOT NULL,
    "lawyerNames" TEXT NOT NULL,
    "clientName" TEXT,
    "sealText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "issuedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_electronic_certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_qr_login_session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "deviceLabel" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_qr_login_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tg_office_code_key" ON "tg_office"("code");

-- CreateIndex
CREATE INDEX "tg_office_active_idx" ON "tg_office"("active");

-- CreateIndex
CREATE INDEX "tg_emergency_pause_module_active_idx" ON "tg_emergency_pause"("module", "active");

-- CreateIndex
CREATE INDEX "tg_personal_party_pool_ownerUserId_name_idx" ON "tg_personal_party_pool"("ownerUserId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tg_criminal_intake_profile_intakeId_key" ON "tg_criminal_intake_profile"("intakeId");

-- CreateIndex
CREATE INDEX "tg_criminal_intake_profile_officeId_workflowStep_idx" ON "tg_criminal_intake_profile"("officeId", "workflowStep");

-- CreateIndex
CREATE INDEX "tg_criminal_intake_profile_createdById_createdAt_idx" ON "tg_criminal_intake_profile"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "tg_criminal_intake_profile_draftExpiresAt_idx" ON "tg_criminal_intake_profile"("draftExpiresAt");

-- CreateIndex
CREATE INDEX "tg_conflict_resolution_case_officeId_status_idx" ON "tg_conflict_resolution_case"("officeId", "status");

-- CreateIndex
CREATE INDEX "tg_conflict_resolution_case_createdById_idx" ON "tg_conflict_resolution_case"("createdById");

-- CreateIndex
CREATE INDEX "tg_conflict_resolution_message_resolutionId_createdAt_idx" ON "tg_conflict_resolution_message"("resolutionId", "createdAt");

-- CreateIndex
CREATE INDEX "tg_bank_statement_batch_officeId_yearMonth_idx" ON "tg_bank_statement_batch"("officeId", "yearMonth");

-- CreateIndex
CREATE INDEX "tg_bank_statement_entry_batchId_status_idx" ON "tg_bank_statement_entry"("batchId", "status");

-- CreateIndex
CREATE INDEX "tg_bank_statement_allocation_entryId_idx" ON "tg_bank_statement_allocation"("entryId");

-- CreateIndex
CREATE INDEX "tg_bank_statement_allocation_lawyerId_status_idx" ON "tg_bank_statement_allocation"("lawyerId", "status");

-- CreateIndex
CREATE INDEX "tg_bank_statement_allocation_officeId_status_idx" ON "tg_bank_statement_allocation"("officeId", "status");

-- CreateIndex
CREATE INDEX "tg_internal_ledger_entry_officeId_tableCode_itemCode_idx" ON "tg_internal_ledger_entry"("officeId", "tableCode", "itemCode");

-- CreateIndex
CREATE INDEX "tg_internal_ledger_entry_userId_tableCode_occurredAt_idx" ON "tg_internal_ledger_entry"("userId", "tableCode", "occurredAt");

-- CreateIndex
CREATE INDEX "tg_finance_batch_c_officeId_yearMonth_idx" ON "tg_finance_batch_c"("officeId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "tg_finance_batch_c_row_batchId_userId_key" ON "tg_finance_batch_c_row"("batchId", "userId");

-- CreateIndex
CREATE INDEX "tg_finance_batch_d_officeId_status_idx" ON "tg_finance_batch_d"("officeId", "status");

-- CreateIndex
CREATE INDEX "tg_finance_batch_d_row_batchId_idx" ON "tg_finance_batch_d_row"("batchId");

-- CreateIndex
CREATE INDEX "tg_peer_transfer_fromUserId_status_idx" ON "tg_peer_transfer"("fromUserId", "status");

-- CreateIndex
CREATE INDEX "tg_peer_transfer_toUserId_status_idx" ON "tg_peer_transfer"("toUserId", "status");

-- CreateIndex
CREATE INDEX "tg_finance_personal_request_userId_status_idx" ON "tg_finance_personal_request"("userId", "status");

-- CreateIndex
CREATE INDEX "tg_finance_personal_request_officeId_requestType_idx" ON "tg_finance_personal_request"("officeId", "requestType");

-- CreateIndex
CREATE UNIQUE INDEX "tg_invoice_portal_link_token_key" ON "tg_invoice_portal_link"("token");

-- CreateIndex
CREATE INDEX "tg_invoice_portal_link_lawyerId_status_idx" ON "tg_invoice_portal_link"("lawyerId", "status");

-- CreateIndex
CREATE INDEX "tg_invoice_portal_link_officeId_invoiceCategory_paymentRece_idx" ON "tg_invoice_portal_link"("officeId", "invoiceCategory", "paymentReceived");

-- CreateIndex
CREATE INDEX "tg_firm_policy_document_active_publishedAt_idx" ON "tg_firm_policy_document"("active", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tg_policy_ack_record_watermarkCode_key" ON "tg_policy_ack_record"("watermarkCode");

-- CreateIndex
CREATE UNIQUE INDEX "tg_policy_ack_record_policyId_userId_key" ON "tg_policy_ack_record"("policyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tg_hr_lifecycle_record_archiveNo_key" ON "tg_hr_lifecycle_record"("archiveNo");

-- CreateIndex
CREATE INDEX "tg_hr_lifecycle_record_userId_recordType_idx" ON "tg_hr_lifecycle_record"("userId", "recordType");

-- CreateIndex
CREATE INDEX "tg_hr_lifecycle_record_officeId_status_idx" ON "tg_hr_lifecycle_record"("officeId", "status");

-- CreateIndex
CREATE INDEX "tg_admin_workflow_request_officeId_requestType_status_idx" ON "tg_admin_workflow_request"("officeId", "requestType", "status");

-- CreateIndex
CREATE INDEX "tg_admin_workflow_request_applicantId_idx" ON "tg_admin_workflow_request"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "tg_electronic_certificate_certNo_key" ON "tg_electronic_certificate"("certNo");

-- CreateIndex
CREATE UNIQUE INDEX "tg_electronic_certificate_verifyCode_key" ON "tg_electronic_certificate"("verifyCode");

-- CreateIndex
CREATE INDEX "tg_electronic_certificate_officeId_status_idx" ON "tg_electronic_certificate"("officeId", "status");

-- CreateIndex
CREATE INDEX "tg_electronic_certificate_caseNoLabel_idx" ON "tg_electronic_certificate"("caseNoLabel");

-- CreateIndex
CREATE UNIQUE INDEX "tg_qr_login_session_token_key" ON "tg_qr_login_session"("token");

-- CreateIndex
CREATE INDEX "tg_qr_login_session_status_expiresAt_idx" ON "tg_qr_login_session"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_personal_party_pool" ADD CONSTRAINT "tg_personal_party_pool_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_criminal_intake_profile" ADD CONSTRAINT "tg_criminal_intake_profile_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_conflict_resolution_case" ADD CONSTRAINT "tg_conflict_resolution_case_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_conflict_resolution_message" ADD CONSTRAINT "tg_conflict_resolution_message_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "tg_conflict_resolution_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_bank_statement_batch" ADD CONSTRAINT "tg_bank_statement_batch_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_bank_statement_entry" ADD CONSTRAINT "tg_bank_statement_entry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "tg_bank_statement_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_bank_statement_allocation" ADD CONSTRAINT "tg_bank_statement_allocation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "tg_bank_statement_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_bank_statement_allocation" ADD CONSTRAINT "tg_bank_statement_allocation_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_internal_ledger_entry" ADD CONSTRAINT "tg_internal_ledger_entry_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_internal_ledger_entry" ADD CONSTRAINT "tg_internal_ledger_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_batch_c" ADD CONSTRAINT "tg_finance_batch_c_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_batch_c_row" ADD CONSTRAINT "tg_finance_batch_c_row_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "tg_finance_batch_c"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_batch_d" ADD CONSTRAINT "tg_finance_batch_d_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_batch_d_row" ADD CONSTRAINT "tg_finance_batch_d_row_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "tg_finance_batch_d"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_peer_transfer" ADD CONSTRAINT "tg_peer_transfer_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_peer_transfer" ADD CONSTRAINT "tg_peer_transfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_peer_transfer" ADD CONSTRAINT "tg_peer_transfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_personal_request" ADD CONSTRAINT "tg_finance_personal_request_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_finance_personal_request" ADD CONSTRAINT "tg_finance_personal_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_invoice_portal_link" ADD CONSTRAINT "tg_invoice_portal_link_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_policy_ack_record" ADD CONSTRAINT "tg_policy_ack_record_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "tg_firm_policy_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_policy_ack_record" ADD CONSTRAINT "tg_policy_ack_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_hr_lifecycle_record" ADD CONSTRAINT "tg_hr_lifecycle_record_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_hr_lifecycle_record" ADD CONSTRAINT "tg_hr_lifecycle_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_admin_workflow_request" ADD CONSTRAINT "tg_admin_workflow_request_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_admin_workflow_request" ADD CONSTRAINT "tg_admin_workflow_request_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tg_electronic_certificate" ADD CONSTRAINT "tg_electronic_certificate_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "tg_office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
