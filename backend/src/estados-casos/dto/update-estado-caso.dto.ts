// backend/src/estados-casos/dto/update-estado-caso.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEstadoCasoDto } from './create-estado-caso.dto';

// PartialType hace que todos los campos de CreateEstadoCasoDto
// sean opcionales, lo cual es perfecto para una actualización (PATCH).
export class UpdateEstadoCasoDto extends PartialType(CreateEstadoCasoDto) {}