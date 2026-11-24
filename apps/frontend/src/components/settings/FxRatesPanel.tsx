import { Alert, Stack } from "@mantine/core";
import type { FxRateDto, ReferenceDataDto } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { useAsync } from "../../hooks/useAsync.js";
import { errorMessage } from "../../lib/errors.js";
import { LatestRatesCard } from "./LatestRatesCard.js";
import { RateEditorCard, type RateDraft } from "./RateEditorCard.js";
import { FxRatesSkeleton } from "./SettingsSkeletons.js";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

function salaryCurrencies(reference: ReferenceDataDto, reportingCurrency: string): string[] {
  const all = new Set(reference.countries.map((c) => c.currency));
  all.delete(reportingCurrency);
  return [...all].sort();
}

/** Rates arrive newest first per currency. */
function latestByCurrency(rates: FxRateDto[]): Map<string, FxRateDto> {
  const latest = new Map<string, FxRateDto>();
  for (const rate of rates) {
    if (!latest.has(rate.currency)) latest.set(rate.currency, rate);
  }
  return latest;
}

const trimRate = (rate: string): string => rate.replace(/0+$/, "").replace(/\.$/, "");

export function FxRatesPanel(): React.JSX.Element {
  const { api } = useAuth();
  const rates = useAsync(() => api.fxRates(), []);
  const reference = useAsync(() => api.reference(), []);
  const [draft, setDraft] = useState<RateDraft>({ currency: null, rate: "", rateDate: todayIso() });
  const [draftVersion, setDraftVersion] = useState(0);

  if (rates.error !== null || reference.error !== null) {
    return (
      <Alert color="red" role="alert" variant="light">
        {errorMessage(rates.error ?? reference.error)}
      </Alert>
    );
  }
  if (rates.data === undefined || reference.data === undefined) {
    return <FxRatesSkeleton />;
  }

  const { reportingCurrency, items } = rates.data;
  const currencies = salaryCurrencies(reference.data, reportingCurrency);

  return (
    <Stack>
      <LatestRatesCard
        currencies={currencies}
        latest={latestByCurrency(items)}
        reportingCurrency={reportingCurrency}
        onChange={(currency, current) => {
          setDraft(
            current
              ? { currency, rate: trimRate(current.rate), rateDate: current.rateDate }
              : { currency, rate: "", rateDate: todayIso() },
          );
          setDraftVersion((version) => version + 1);
        }}
      />
      <RateEditorCard
        key={draftVersion}
        initial={draft}
        currencies={currencies}
        rates={items}
        reportingCurrency={reportingCurrency}
        onSaved={rates.reload}
      />
    </Stack>
  );
}
