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
import { TreeWidget } from '@features/tree';
import { KnowMeWidget } from '@features/know-me';
import { AlbumWidget } from '@features/album';

// Dashboard widgets contributed by features. Appended as features are built.
export const widgets: DashboardWidget[] = [
  defineWidget({
    id: 'partner-presence',
    featureId: 'presence',
    Component: PartnerPresenceWidget,
    category: 'Us',
    order: 5,
  }),
  defineWidget({
    id: 'days-together',
    featureId: 'days-together',
    Component: DaysTogetherWidget,
    category: 'Us',
    order: 6,
  }),
  defineWidget({
    id: 'distance',
    featureId: 'distance',
    Component: DistanceWidget,
    category: 'Us',
    order: 7,
  }),
  defineWidget({
    id: 'timezone',
    featureId: 'timezone',
    Component: TimezoneWidget,
    category: 'Us',
    order: 8,
  }),
  defineWidget({
    id: 'currency',
    featureId: 'currency',
    Component: CurrencyWidget,
    category: 'Everyday',
    order: 9,
  }),
  defineWidget({
    id: 'today-polaroid',
    featureId: 'polaroid',
    Component: TodayPolaroidWidget,
    category: 'Today',
    order: 10,
  }),
  defineWidget({
    id: 'tree',
    featureId: 'tree',
    Component: TreeWidget,
    category: 'Today',
    order: 11,
  }),
  defineWidget({
    id: 'know-me',
    featureId: 'know-me',
    Component: KnowMeWidget,
    category: 'Today',
    order: 12,
  }),
  defineWidget({
    id: 'album-progress',
    featureId: 'album',
    Component: AlbumWidget,
    category: 'Our trip',
    order: 21,
    size: 2,
  }),
  defineWidget({
    id: 'next-countdown',
    featureId: 'countdowns',
    Component: NextCountdownWidget,
    category: 'Our trip',
    order: 20,
  }),
  defineWidget({
    id: 'flowers',
    featureId: 'flowers',
    Component: FlowersWidget,
    category: 'Today',
    order: 22,
  }),
  defineWidget({
    id: 'fight-timer',
    featureId: 'fight-timer',
    Component: FightTimerWidget,
    category: 'Everyday',
    order: 24,
  }),
  defineWidget({
    id: 'finance',
    featureId: 'finance',
    Component: FinanceWidget,
    category: 'Everyday',
    order: 26,
  }),
];

export const widgetRegistry = createWidgetRegistry(widgets);
