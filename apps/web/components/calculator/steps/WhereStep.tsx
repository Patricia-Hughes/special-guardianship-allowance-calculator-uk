'use client';

import { FLAGS, type EnglandRegion, type Nation } from '@sgo/engine';
import { CouncilPicker } from '../CouncilPicker';
import { FieldError, RadioGroup, StepNav, StepPanel } from '../fields';
import type { StepProps } from './types';

const NATIONS: ReadonlyArray<readonly [Nation, string]> = [
  ['england', 'England'],
  ['wales', 'Wales'],
  ['scotland', 'Scotland'],
  ['northern-ireland', 'Northern Ireland'],
];

const REGIONS: ReadonlyArray<readonly [EnglandRegion, string]> = [
  ['london', 'London, the 32 boroughs and the City of London'],
  ['south-east', 'South East England'],
  ['rest-of-england', 'Anywhere else in England'],
];

export function WhereStep({ form, set, errorFor, headingRef, goTo }: StepProps) {
  const chooseNation = (nation: Nation): void =>
    set((f) => ({
      ...f,
      nation,
      // A region or council chosen for England means nothing anywhere else, and
      // leaving it set would send a Welsh carer down the English rate lookup.
      ...(nation === 'england' ? {} : { region: '' as const, la: '' }),
    }));

  return (
    <StepPanel heading="Where do you live?" headingRef={headingRef} stepNumber={1}>
      <RadioGroup
        legend="Which nation?"
        name="nation"
        options={NATIONS}
        selected={form.nation}
        onSelect={chooseNation}
      />

      {form.nation === 'wales' && !FLAGS.WALES_ROUTE_ENABLED && (
        <div className="callout callout--important" role="note" aria-label="Important">
          <p className="flush">
            <strong>I am not showing Welsh figures yet.</strong> I am checking the Welsh rates
            against the Welsh Government&apos;s own published table before I publish them, one of
            the age bands in the sources I have looks wrong, and a wrong figure here is worse than
            none. The rest of this guide still applies in Wales.
          </p>
        </div>
      )}

      {form.nation === 'england' && (
        <>
          <CouncilPicker
            value={form.la}
            postcodeLookupEnabled={FLAGS.POSTCODE_LOOKUP}
            onChange={(la, region) => set((f) => ({ ...f, la, ...(region ? { region } : {}) }))}
          />
          <RadioGroup
            id="region-fieldset"
            legend="Or choose your region"
            name="region"
            options={REGIONS}
            selected={form.region}
            onSelect={(region) => set((f) => ({ ...f, region }))}
            footer={
              /*
                The government publishes rates by region but no list of which
                council is in which region, so the mapping is ours, not theirs.
                Saying so is both honest and practical: it pre-empts the
                complaint from a carer near a boundary, and it tells them the
                fix is the radio buttons they are already looking at.
              */
              <p className="field__hint">
                The government publishes rates by region but does not publish a list of which
                council is in which region. I use the standard national regions. If you think yours is wrong, choose it here, your choice overrides mine.
              </p>
            }
          >
            <FieldError id="region-error" message={errorFor('carer.englandRegion')} />
            <span className="field__hint">
              Rates are higher in London and the South East. If you picked a council above, I have already filled this in.
            </span>
          </RadioGroup>
        </>
      )}

      <StepNav
        onNext={() => goTo('children')}
        nextDisabled={!form.nation || (form.nation === 'england' && !form.region && !form.la)}
      />
    </StepPanel>
  );
}
