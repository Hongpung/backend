import { IsBoolean, IsIn, IsInt, IsString, IsUrl } from "class-validator";

export class CreateInstrumentDto {
    @IsString()
    @IsIn(['꽹과리','징','장구','북','소고','기타'])
    instrumentType:string;

    @IsString()
    name:string;

    @IsUrl()
    imageUrl?:string;

}

export class AdminCreateInstrumentDto {
    
    @IsString()
    @IsIn(['꽹과리','징','장구','북','소고','기타'])
    instrumentType:string

    @IsInt()
    clubId:number;

    @IsString()
    name:string;

    @IsUrl()
    imageUrl?:string;
}

// enum instrumentType {
//     KWANGGWARI
//     JING
//     JANGGU
//     BUK
//     SOGO
//     ELSE
//   }
  
//   model Instrument {
//     instrumentId    Int            @id @default(autoincrement())
//     instrumentType  instrumentType
//     clubId          Int
//     club            Club           @relation(fields: [clubId], references: [clubId], onDelete: Cascade)
//     name            String
//     imageUrl        String?
//     borrowAvailable Boolean
  
//     borrowHistory Session[]
//     Reservation   Reservation[]
  
//     @@index([clubId], map: "instuments_club_fkey")
//   }