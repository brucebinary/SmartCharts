import { observable, action, computed } from 'mobx';
import PriceLineStore from './PriceLineStore';
import ShadeStore from './ShadeStore';
import PendingPromise from '../utils/PendingPromise';

export default class BarrierStore {
    static get SHADE_COLOR_RED() { return 'red'; }
    static get SHADE_COLOR_GREEN() { return 'green'; }

    static get SHADE_NONE_SINGLE() { return 'SHADE_NONE_SINGLE'; }
    static get SHADE_NONE_DOUBLE() { return 'SHADE_NONE_DOUBLE'; }
    static get SHADE_ABOVE() { return 'SHADE_ABOVE'; }
    static get SHADE_BELOW() { return 'SHADE_BELOW'; }
    static get SHADE_BETWEEN() { return 'SHADE_BETWEEN'; }
    static get SHADE_OUTSIDE() { return 'SHADE_OUTSIDE'; }

    static get BARRIER_CHANGED() { return 'BARRIER_CHANGED'; }

    @observable shadeColor = BarrierStore.SHADE_COLOR_GREEN;
    @observable isBetweenShadeVisible = false;
    @observable isTopShadeVisible = false;
    @observable isBottomShadeVisible = false;
    @observable hidePriceLines = false;
    @observable lineStyle = undefined;
    @observable isInitialized = false;
    @observable initializePromise = new PendingPromise();
    _shadeState;

    @computed get pip() { return this.mainStore.chart.currentActiveSymbol.decimal_places; }

    constructor(mainStore) {
        this.mainStore = mainStore;
        this._high_barrier = new PriceLineStore(this.mainStore);
        this._low_barrier = new PriceLineStore(this.mainStore);

        this._high_barrier.onPriceChanged(this._drawShadedArea);
        this._low_barrier.onPriceChanged(this._drawShadedArea);

        this._high_barrier.onDragReleased(this._fireOnBarrierChange);
        this._low_barrier.onDragReleased(this._fireOnBarrierChange);

        this._injectionId = this.stx.append('draw', this._drawShadedArea);

        this._setupConstrainBarrierPrices();

        this._listenerId = this.stx.addEventListener('newChart', this.init);

        this.aboveShade = new ShadeStore();
        this.betweenShade = new ShadeStore();
        this.belowShade = new ShadeStore();

        this.shadeState = BarrierStore.SHADE_NONE_SINGLE;

        if (this.context && this.stx.currentQuote()) { this.init(); }
    }

    @action.bound init() {
        this.isInitialized = true;
        this.initializePromise.resolve();

        // Enable this to test barriers; high low values are mandatory
        // for library user to provide
        // this.setDefaultBarrier();
    }

    setDefaultBarrier() {
        const price = this.relative ? 0 : this.stx.currentQuote().Close;
        const distance = this.chart.yAxis.priceTick;
        this._high_barrier.price = price + distance;
        this._low_barrier.price = price - distance;
        this._high_barrier._updateTop();
        this._low_barrier._updateTop();
        this._drawShadedArea();
    }

    destructor() {
        this.stx.removeInjection(this._injectionId);
        this.stx.removeEventListener(this._listenerId);
        this._high_barrier.destructor();
        this._low_barrier.destructor();
    }

    get high_barrier() { return this._high_barrier.price; }
    get low_barrier() { return this._low_barrier.price; }
    set high_barrier(price) { this._high_barrier.price = price; }
    set low_barrier(price) { this._low_barrier.price = price; }

    _setupConstrainBarrierPrices() {
        // barrier 1 cannot go below barrier 2
        this._high_barrier.priceConstrainer = (newPrice) => {
            if (this._low_barrier.visible) {
                if (newPrice < this._low_barrier.realPrice) {
                    return this._high_barrier.realPrice;
                }
            }

            return newPrice;
        };

        // barrier 2 cannot go above barrier 1
        this._low_barrier.priceConstrainer = (newPrice) => {
            if (newPrice > this._high_barrier.realPrice) {
                return this._low_barrier.realPrice;
            }

            return newPrice;
        };
    }

    get context() { return this.mainStore.chart.context; }
    get stx() { return this.context.stx; }
    get chart() { return this.stx.chart; }

    _onBarrierChange = null;

    set onBarrierChange(callback) {
        if (this._onBarrierChange !== callback) {
            this._onBarrierChange = callback;
        }
    }

    _fireOnBarrierChange = () => {
        const high = this._high_barrier.visible ? +this._high_barrier.price.toFixed(this.pip) : undefined;
        const low  = this._low_barrier.visible  ? +this._low_barrier.price.toFixed(this.pip)  : undefined;

        if (this._onBarrierChange) { this._onBarrierChange({ high, low }); }
    };

    get shadeState() {
        return this._shadeState;
    }

    set shadeState(shadeState) {
        if (this._shadeState === shadeState) { return; }
        this._shadeState = shadeState;

        const noShade =
            this._shadeState === BarrierStore.SHADE_NONE_SINGLE
            || this._shadeState === BarrierStore.SHADE_NONE_DOUBLE;

        if (noShade) {
            this.aboveShade.visible = false;
            this.betweenShade.visible = false;
            this.belowShade.visible = false;
        } else {
            const aboveShadeEnable =
                this._shadeState === BarrierStore.SHADE_ABOVE
                || this._shadeState === BarrierStore.SHADE_OUTSIDE;
            const belowShadeEnable =
                this._shadeState === BarrierStore.SHADE_BELOW
                || this._shadeState === BarrierStore.SHADE_OUTSIDE;
            const betweenShadeEnable =
                this._shadeState === BarrierStore.SHADE_BETWEEN;

            this.aboveShade.visible = aboveShadeEnable;
            this.betweenShade.visible = betweenShadeEnable;
            this.belowShade.visible = belowShadeEnable;

            this._drawShadedArea();
        }

        const showLowBarrier =
            this._shadeState === BarrierStore.SHADE_OUTSIDE
            || this._shadeState === BarrierStore.SHADE_BETWEEN
            || this._shadeState === BarrierStore.SHADE_NONE_DOUBLE;

        const wasLowBarrierVisible = this._low_barrier.visible;
        this._low_barrier.visible = showLowBarrier;

        if (this.isInitialized && showLowBarrier && !wasLowBarrierVisible) {
            if (this._low_barrier.realPrice >= this._high_barrier.realPrice) {
                // fix position if _low_barrier above _high_barrier, since _low_barrier position is not updated when not visible
                this._low_barrier.price = this._high_barrier.price - this.chart.yAxis.priceTick;
            }
        }
    }

    get relative() {
        return this._high_barrier.relative;
    }

    set relative(value) {
        this._high_barrier.relative = value;
        this._low_barrier.relative = value;
    }

    get draggable() {
        return this._high_barrier.draggable;
    }

    set draggable(value) {
        this._high_barrier.draggable = value;
        this._low_barrier.draggable = value;
    }

    @action.bound _drawShadedArea() {
        if (!this.isInitialized) { return; }

        if (this._shadeState === BarrierStore.SHADE_ABOVE) {
            this._shadeAbove();
        } else if (this._shadeState === BarrierStore.SHADE_BELOW) {
            this._shadeBelow();
        } else if (this._shadeState === BarrierStore.SHADE_BETWEEN) {
            this._shadeBetween();
        } else if (this._shadeState === BarrierStore.SHADE_OUTSIDE) {
            this._shadeOutside();
        }

        if (this._low_barrier.visible && this._isBarriersOffScreen()) {
            const order = (this._high_barrier.top === 0) ? null : 101;
            this._high_barrier.zIndex = order;
        }
    }

    _isBarriersOffScreen() {
        return this._high_barrier.offScreen && this._low_barrier.offScreen;
    }

    _calcBottomShade(barrier) {
        return this.chart.panel.height - barrier.top;
    }

    _shadeBetween() {
        const bottom = this._calcBottomShade(this._low_barrier);
        this.betweenShade.top = this._high_barrier.top;
        this.betweenShade.bottom = bottom;
    }

    _shadeBelow(barrier = this._high_barrier) {
        this.belowShade.top = barrier.top;
        this.belowShade.bottom = 0;
    }

    _shadeAbove(barrier = this._high_barrier) {
        const bottom = this._calcBottomShade(barrier);
        this.aboveShade.top = 0;
        this.aboveShade.bottom = bottom;
    }

    _shadeOutside() {
        this._shadeAbove(this._high_barrier);
        this._shadeBelow(this._low_barrier);
    }
}
