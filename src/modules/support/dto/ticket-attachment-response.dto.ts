import { ApiProperty } from '@nestjs/swagger';

export class TicketAttachmentResponseDto {
  @ApiProperty() attachmentId: number;
  @ApiProperty() messageId: number;
  @ApiProperty() fileName: string;
  @ApiProperty() fileUrl: string;
  @ApiProperty() fileType: string;
  @ApiProperty() fileSize: number;
  @ApiProperty() uploadedAt: string;
}
