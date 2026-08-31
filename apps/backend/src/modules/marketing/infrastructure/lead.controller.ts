import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { SubmitLeadUseCase } from "../application/submit-lead.usecase.js";
import { InvalidLeadError } from "../domain/lead.entity.js";
import { KyselyLeadRepository } from "./lead-repository.kysely.js";

export async function submitLeadController(req: Request, trx: Trx): Promise<TxResult> {
  const { establishmentName, email, businessType } = req.body as {
    establishmentName?: string;
    email?: string;
    businessType?: string;
  };

  const useCase = new SubmitLeadUseCase(new KyselyLeadRepository(trx));

  try {
    const lead = await useCase.execute({
      establishmentName: establishmentName ?? "",
      email: email ?? "",
      businessType: businessType ?? "",
    });
    return { status: 201, body: { id: lead.id } };
  } catch (err) {
    if (err instanceof InvalidLeadError) {
      return { status: 400, body: { error: err.message } };
    }
    throw err;
  }
}
