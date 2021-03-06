import React from 'react';
import { connect } from '../store/Connect';
import Menu from './Menu.jsx';
import List from './List.jsx';
import { DrawIcon, ClearIcon, MeasureIcon } from './Icons.jsx';
import '../../sass/components/_draw-tools.scss';

const DrawTools = ({
    clearAll,
    selectTool,
    Menu,
    menuOpen,
    DrawList,
}) => (
    <Menu
        className="ciq-draw-tools"
    >
        <Menu.Title>
            <DrawIcon
                className={`ic-icon-with-sub ${menuOpen ? 'active' : ''}`}
                tooltip-title={t.translate('Draw tools')}
            />
        </Menu.Title>

        <Menu.Body>
            <div className="title">
                <div className="ciq-bars-title">{t.translate('Draw tools')}</div>
                <div className="ciq-bars-buttons">
                    <ClearIcon
                        className="ciq-tooltip"
                        onClick={clearAll}
                        tooltip-title={t.translate('Clear All')}
                    />
                    <MeasureIcon
                        style={{ display: 'none' /* TODO: measurement tool doesn't show measurement */ }}
                        className="ciq-tooltip"
                        onClick={() => selectTool('measure')}
                        tooltip-title={t.translate('Measure')}
                    />
                </div>
            </div>
            <div className="body">
                <DrawList />
            </div>
        </Menu.Body>
    </Menu>
);

export default connect(({ drawTools: dt }) => ({
    clearAll: dt.clearAll,
    selectTool: dt.selectTool,
    Menu: dt.menu.connect(Menu),
    menuOpen: dt.menu.open,
    DrawList: dt.list.connect(List),
}))(DrawTools);
