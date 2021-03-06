import React from 'react';
import {
    Switch,
    NumericInput,
    ColorPicker,
    Slider,
    Pattern,
    DropDown,
    NumberColorPicker,
    FontSetting,
} from './Form.jsx';
import { DeleteIcon, StarIcon } from './Icons.jsx';
import '../../sass/components/_ciq-settings-dialog.scss';

const SettingsDialog = ({
    items, // [{ id, title, value, defaultValue, type }]
    title,
    description,
    activeTab,
    setOpen,
    showTabs,
    onTabClick,
    stared,
    onDeleteClick,
    onStarClick,
    onResetClick,
    onItemChange,
    isFavoritable,
    Dialog,
    open,
}) => {
    const renderMap = {
        switch: item => (
            <Switch
                value={item.value}
                onChange={v => onItemChange(item.id, v)}
            />
        ),
        colorpicker: item => (
            <ColorPicker
                color={item.value}
                setColor={value => onItemChange(item.id, value)}
            />
        ),
        pattern: (item) => {
            const lineWidth = items.filter(it => it.id === 'lineWidth')[0].value;
            return (
                <Pattern
                    pattern={item.value}
                    lineWidth={lineWidth}
                    onChange={(v) => {
                        onItemChange('pattern', v.pattern);
                        onItemChange('lineWidth', v.width);
                    }}
                />
            );
        },
        select: item => (
            <DropDown
                rows={Object.keys(item.options)}
                title={item.value}
                onRowClick={value => onItemChange(item.id, value)}
            >
                {row => row}
            </DropDown>
        ),
        number: item => (
            <Slider
                min={item.min || 1}
                step={item.step || 1}
                max={item.max || 100}
                value={item.value}
                onChange={val => onItemChange(item.id, val)}
            />
        ),
        numericinput: item => (
            <span className="ciq-num-input">
                <NumericInput
                    value={item.value}
                    onChange={val => onItemChange(item.id, val)}
                    min={item.min}
                    step={item.step}
                    max={item.max}
                />
            </span>
        ),
        numbercolorpicker: item => (
            <NumberColorPicker
                value={item.value}
                onChange={val => onItemChange(item.id, val)}
            />
        ),
        font: item => (
            <FontSetting
                value={item.value}
                onChange={val => onItemChange(item.id, val)}
            />
        ),
    };
    return (
        <div className={`cq-dialog-overlay ${open ? 'cq-dialog-active' : ''}`} >
            <Dialog className="cq-dialog cq-settings-dialog">
                <div className={`titlebar ${!showTabs ? 'no-tabs' : ''}`}>
                    <div className="title">{title}</div>
                    <div className="icons">
                        { onDeleteClick && <DeleteIcon
                            onClick={onDeleteClick}
                            className="margin"
                        />}
                        { isFavoritable &&
                    <StarIcon
                        onClick={onStarClick}
                        className={`margin ciq-favorite ${stared ? 'ciq-active-favorite' : ''}`}
                    />}
                    </div>
                </div>

                { showTabs &&
                <div className="tabs">
                    <div
                        onClick={() => onTabClick('settings')}
                        className={activeTab === 'settings' ? 'active' : ''}
                    > Settings
                    </div>
                    <div
                        onClick={() => onTabClick('description')}
                        className={activeTab === 'description' ? 'active' : ''}
                    > Description
                    </div>
                    <div className={`active-border ${activeTab === 'settings' ? 'first' : 'second'}`} />
                </div>
                }

                { activeTab === 'settings' ?
                    <React.Fragment>
                        <div className="items" >
                            {items
                                .map(item => (renderMap[item.type] &&
                                <div key={item.id} className="item">
                                    <div className="title">
                                        <span>{item.title}</span>
                                        {renderMap[item.type](item)}
                                    </div>
                                </div>
                                ))
                            }
                        </div>
                        <div className="buttons">
                            <div
                                className="reset"
                                onClick={onResetClick}
                            >{t.translate('RESET')}
                            </div>
                            <div
                                className="done"
                                onClick={() => setOpen(false)}
                            >{t.translate('DONE')}
                            </div>
                        </div>
                    </React.Fragment>
                    :
                    <div className="description">
                        {description}
                    </div>
                }
            </Dialog>
        </div>
    );
};

export default SettingsDialog;
