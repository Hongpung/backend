import { ApiProperty } from '@nestjs/swagger';

export class SignedUrlPairResDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  imageUrl: string;
}

export class UploadSingleImageResDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  imageUrl: string;
}

export class UploadMultipleImagesResDto {
  @ApiProperty({ type: [SignedUrlPairResDto] })
  uploadUrls: SignedUrlPairResDto[];
}
