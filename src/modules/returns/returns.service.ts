import { Injectable } from '@nestjs/common';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessReturnDto, RejectAfterInspectionDto } from './dto/process-return.dto';
import { QueryReturnsDto } from './dto/query-returns.dto';
import {
  ProcessRefundResolutionDto, ProcessExchangeResolutionDto,
  ProcessWarrantyReturnDto, UpdateWarrantyStatusDto,
  UpdateDefectiveHandlingDto, CompleteReuseDto, ChangeResolutionDto,
} from './dto/process-resolution.dto';
import { ConfirmGoodsReceivedDto } from './dto/confirm-received.dto';
import { ReturnsQueryService } from './returns-query.service';
import { ReturnsWorkflowService } from './returns-workflow.service';
import { ReturnsResolutionService } from './returns-resolution.service';
import { ReturnsWarrantyService } from './returns-warranty.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly queryService: ReturnsQueryService,
    private readonly workflowService: ReturnsWorkflowService,
    private readonly resolutionService: ReturnsResolutionService,
    private readonly warrantyService: ReturnsWarrantyService,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────
  submitReturn(dto: CreateReturnDto, customerId: number) {
    return this.workflowService.submitReturn(dto, customerId);
  }

  getMyReturns(customerId: number, query: QueryReturnsDto) {
    return this.queryService.getMyReturns(customerId, query);
  }

  // ─── Admin — Queries ──────────────────────────────────────────────────────
  findAll(query: QueryReturnsDto) {
    return this.queryService.findAll(query);
  }

  findOne(id: number) {
    return this.queryService.findOne(id);
  }

  getReturnAssets(returnRequestId: number) {
    return this.queryService.getReturnAssets(returnRequestId);
  }

  // ─── Admin — Workflow ─────────────────────────────────────────────────────
  processReturn(id: number, dto: ProcessReturnDto, employeeId: number) {
    return this.workflowService.processReturn(id, dto, employeeId);
  }

  confirmGoodsReceived(id: number, dto: ConfirmGoodsReceivedDto, employeeId: number) {
    return this.workflowService.confirmGoodsReceived(id, dto, employeeId);
  }

  updateInspectionResult(id: number, inspectionResult: string, employeeId: number) {
    return this.workflowService.updateInspectionResult(id, inspectionResult, employeeId);
  }

  completeInspection(id: number, employeeId: number) {
    return this.workflowService.completeInspection(id, employeeId);
  }

  rejectAfterInspection(id: number, dto: RejectAfterInspectionDto, employeeId: number) {
    return this.workflowService.rejectAfterInspection(id, dto, employeeId);
  }

  addReturnAsset(returnRequestId: number, assetId: number, loaiAsset: 'customer_evidence' | 'inspection_evidence') {
    return this.workflowService.addReturnAsset(returnRequestId, assetId, loaiAsset);
  }

  // ─── Admin — Resolution ───────────────────────────────────────────────────
  processRefund(returnRequestId: number, dto: ProcessRefundResolutionDto, employeeId: number) {
    return this.resolutionService.processRefund(returnRequestId, dto, employeeId);
  }

  processExchange(returnRequestId: number, dto: ProcessExchangeResolutionDto, employeeId: number) {
    return this.resolutionService.processExchange(returnRequestId, dto, employeeId);
  }

  changeResolution(returnRequestId: number, dto: ChangeResolutionDto, employeeId: number) {
    return this.resolutionService.changeResolution(returnRequestId, dto, employeeId);
  }

  confirmExchangeDelivered(resolutionId: number, employeeId: number) {
    return this.resolutionService.confirmExchangeDelivered(resolutionId, employeeId);
  }

  // ─── Admin — Warranty ─────────────────────────────────────────────────────
  initWarrantyResolution(returnRequestId: number, phieuNhapKhoId: number | null, employeeId: number) {
    return this.warrantyService.initWarrantyResolution(returnRequestId, phieuNhapKhoId, employeeId);
  }

  updateWarrantyStatus(resolutionId: number, dto: UpdateWarrantyStatusDto) {
    return this.warrantyService.updateWarrantyStatus(resolutionId, dto);
  }

  processWarranty(returnRequestId: number, dto: ProcessWarrantyReturnDto, employeeId: number) {
    return this.warrantyService.processWarranty(returnRequestId, dto, employeeId);
  }

  updateDefectiveHandling(resolutionId: number, dto: UpdateDefectiveHandlingDto, employeeId: number) {
    return this.warrantyService.updateDefectiveHandling(resolutionId, dto, employeeId);
  }

  completeDefectiveReuse(resolutionId: number, dto: CompleteReuseDto, employeeId: number) {
    return this.warrantyService.completeDefectiveReuse(resolutionId, dto, employeeId);
  }
}
