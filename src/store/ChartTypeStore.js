import { action, computed, observable, when } from 'mobx';
import MenuStore from './MenuStore';
import ListStore from './ListStore';
import {
    BaseLineIcon,
    CandleIcon,
    DotIcon,
    HeikinAshiIcon,
    HollowCandleIcon,
    KagiIcon,
    LineBreakIcon,
    LineIcon,
    OHLCIcon,
    PointFigureIcon,
    RangeBarsIcon,
    RenkoIcon,
    SplineIcon,
} from '../components/Icons.jsx';
import SettingsDialogStore from './SettingsDialogStore';

export function getChartTypes() {
    return [
        { id: 'mountain',      text: t.translate('Line'),           candleOnly: false, icon: LineIcon         },
        { id: 'line',          text: t.translate('Dot'),            candleOnly: false, icon: DotIcon          },
        { id: 'colored_line',  text: t.translate('Colored Dot'),    candleOnly: false, icon: DotIcon          },
        { id: 'spline',        text: t.translate('Spline'),         candleOnly: false, icon: SplineIcon       },
        { id: 'baseline',      text: t.translate('Baseline'),       candleOnly: false, icon: BaseLineIcon     },
        { id: 'candle',        text: t.translate('Candle'),         candleOnly: true,  icon: CandleIcon       },
        { id: 'colored_bar',   text: t.translate('OHLC'),           candleOnly: true,  icon: OHLCIcon         },
        { id: 'hollow_candle', text: t.translate('Hollow Candle'),  candleOnly: true,  icon: HollowCandleIcon },
        { id: 'heikinashi',    text: t.translate('Heikin Ashi'),    candleOnly: true,  icon: HeikinAshiIcon   },
        { id: 'kagi',          text: t.translate('Kagi'),           candleOnly: true,  icon: KagiIcon,        settingsOnClick: true },
        { id: 'linebreak',     text: t.translate('Line Break'),     candleOnly: true,  icon: LineBreakIcon,   settingsOnClick: true },
        { id: 'renko',         text: t.translate('Renko'),          candleOnly: true,  icon: RenkoIcon,       settingsOnClick: true },
        { id: 'rangebars',     text: t.translate('Range Bars'),     candleOnly: true,  icon: RangeBarsIcon,   settingsOnClick: true },
        { id: 'pandf',         text: t.translate('Point & Figure'), candleOnly: true,  icon: PointFigureIcon, settingsOnClick: true },
    ];
}

function getAggregates() {
    return {
        heikinashi: true,
        kagi: {
            title: t.translate('Kagi'),
            inputs: [{
                id: 'kagi',
                title: t.translate('Reversal Percentage'),
                type: 'numericinput',
            }],
        },
        renko: {
            title: t.translate('Renko'),
            inputs: [{
                id: 'renko',
                title: t.translate('Range'),
                type: 'numericinput',
            }],
        },
        linebreak: {
            title: t.translate('Line Break'),
            inputs: [{
                id: 'priceLines',
                title: t.translate('Price Lines'),
                type: 'numericinput',
                max: 10,
                step: 1,
                min: 1,
            }],
        },
        rangebars: {
            title: t.translate('Range Bars'),
            inputs: [{
                id: 'range',
                title: t.translate('Range'),
                type: 'numericinput',
            }],
        },
        pandf: {
            title: t.translate('Point & Figure'),
            inputs: [{
                id: 'box',
                title: t.translate('Box Size'),
                type: 'numericinput',
            }, {
                id: 'reversal',
                title: t.translate('Reversal'),
                type: 'numericinput',
            }],
        },
    };
}

const notCandles = getChartTypes()
    .filter(t => !t.candleOnly)
    .map(t => t.id);

export default class ChartTypeStore {
    constructor(mainStore) {
        this.mainStore = mainStore;
        when(() => this.context, this.onContextReady);
        this.menu = new MenuStore(mainStore, { route:'chart-type' });

        this.list = new ListStore({
            getContext: () => this.context,
            getItems: () => this.types,
        });

        this.settingsDialog = new SettingsDialogStore({
            mainStore,
            onChanged: items => this.updateAggregate(items),
        });
    }

    get context() { return this.mainStore.chart.context; }
    get stx() { return this.context.stx; }
    get chartTypeProp() { return this.mainStore.chart.paramProps.chartType; }

    onContextReady = () => {
        this.aggregates = getAggregates();
        this.chartTypes = getChartTypes();

        let chartType;
        if (this.stx.layout.tension) { // We assume that if tension is set, spline is enabled
            chartType = 'spline';
        } else if (this.aggregates[this.stx.layout.aggregationType]) {
            chartType = this.stx.layout.aggregationType;
        } else {
            chartType = this.stx.layout.chartType;
        }
        const typeIdx = this.chartTypes.findIndex(t => t.id === chartType);
        this.type = this.chartTypes[typeIdx];

        this.context.stx.addEventListener('newChart', this.syncTypeWithGranularity);
    };

    syncTypeWithGranularity = () => {
        const isTick = this.stx.layout.timeUnit === 'second';
        const isCandle = notCandles.indexOf(this.type.id) === -1;

        if (isCandle && isTick) {
            this.setType('mountain');
        } else if (!isTick && !isCandle && this.chartTypeProp === undefined) {
            this.setType('candle');
        }
    };

    @action.bound setTypeFromUI(type) {
        if (this.chartTypeProp !== undefined) {
            console.error('Changing chart type does nothing because chartType prop is being set. Consider overriding the onChange prop in <ChartTypes />');
            return;
        }

        this.setType(type);
    }

    @action.bound setType(type) {
        if (typeof type === 'string') {
            type = this.types.find(t => t.id === type);
        }
        if (type.id === this.type.id) {
            return;
        }
        if (type.id === 'spline') {
            // Spline is just a line with tension
            this.stx.chart.tension = this.stx.layout.tension = 0.5;
            this.stx.setChartType('mountain');
        } else {
            this.stx.chart.tension = 0;
            delete this.stx.layout.tension;
            if (this.aggregates[type.id]) {
                this.stx.setAggregationType(type.id);
            } else {
                this.stx.setChartType(type.id);
            }
        }
        this.type = type;
        this.mainStore.timeperiod.showCountdown(true);
    }

    @action.bound showAggregateDialog(aggregateId) {
        if (aggregateId !== this.type.id) {
            this.setType(aggregateId);
        }
        const aggregate = this.aggregates[aggregateId];
        this.settingsDialog.title = aggregate.title;
        const inputs = aggregate.inputs.map(({ id, ...agg }) => {
            const name = (id === 'box' || id === 'reversal') ? `pandf.${id}` : id;
            const tuple = CIQ.deriveFromObjectChain(this.stx.layout, name);
            const value = tuple.obj[tuple.member];
            const defaultValue = this.stx.chart.defaultChartStyleConfig[id];
            return {
                id: name,
                value: (value != undefined) ? value : defaultValue, // eslint-disable-line eqeqeq
                defaultValue,
                ...agg,
            };
        });
        this.settingsDialog.items = inputs;
        this.settingsDialog.setOpen(true);
    }

    updateAggregate = (items) => {
        for (const { id, value } of items) {
            const tuple = CIQ.deriveFromObjectChain(this.stx.layout, id);
            tuple.obj[tuple.member] = value;
        }
        this.stx.changeOccurred('layout');
        this.stx.createDataSet();
        this.stx.draw();
    };

    @computed get types() {
        const isTickSelected = this.mainStore.timeperiod.timeUnit === 'tick';

        return this.chartTypes.map(t => ({
            ...t,
            active: t.id === this.type.id,
            disabled: t.candleOnly ? isTickSelected : false,
        }));
    }

    @observable type;
}
