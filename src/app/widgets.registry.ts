import {
  createWidgetRegistry,
  defineWidget,
  type DashboardWidget,
} from '@kernel/registry';
import { NextCountdownWidget } from '@features/countdowns';
import { TodayPolaroidWidget } from '@features/polaroid';
import { PartnerPresenceWidget } from '@features/presence';
import { DaysTogetherWidget } from '@features/days-together';
import { DistanceWidget } from '@features/distance';
import { TimezoneWidget } from '@features/timezone';
import { CurrencyWidget } from '@features/currency';
import { FlowersWidget } from '@features/flowers';
import { FightTimerWidget } from '@features/fight-timer';
import { FinanceWidget } from '@features/finance';

// Dashboard widgets contributed by features. Appended as features are built.
export const widgets: DashboardWidget[] = [
  defineWidget({
    id: 'partner-presence',
    featureId: 'presence',
    Component: PartnerPresenceWidget,
    order: 5,
  }),
  defineWidget({
    id: 'days-together',
    featureId: 'days-together',
    Component: DaysTogetherWidget,
    order: 6,
  }),
  defineWidget({
    id: 'distance',
    featureId: 'distance',
    Component: DistanceWidget,
    order: 7,
  }),
  defineWidget({
    id: 'timezone',
    featureId: 'timezone',
    Component: TimezoneWidget,
    order: 8,
  }),
  defineWidget({
    id: 'currency',
    featureId: 'currency',
    Component: CurrencyWidget,
    order: 9,
  }),
  defineWidget({
    id: 'today-polaroid',
    featureId: 'polaroid',
    Component: TodayPolaroidWidget,
    order: 10,
  }),
  defineWidget({
    id: 'next-countdown',
    featureId: 'countdowns',
    Component: NextCountdownWidget,
    order: 20,
  }),
  defineWidget({
    id: 'flowers',
    featureId: 'flowers',
    Component: FlowersWidget,
    order: 22,
  }),
  defineWidget({
    id: 'fight-timer',
    featureId: 'fight-timer',
    Component: FightTimerWidget,
    order: 24,
  }),
  defineWidget({
    id: 'finance',
    featureId: 'finance',
    Component: FinanceWidget,
    order: 26,
  }),
];

export const widgetRegistry = createWidgetRegistry(widgets);
