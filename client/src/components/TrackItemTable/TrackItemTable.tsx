import { Box, Flex } from '@rebass/grid';
import { Button, Icon, Input, Table } from 'antd';
// tslint:disable-next-line: no-submodule-imports
import { PaginationConfig } from 'antd/lib/table';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import Moment from 'react-moment';
import { convertDate, DATE_TIME_FORMAT, INPUT_DATE_FORMAT, TIME_FORMAT } from '../../constants';
import { TrackItemType } from '../../enum/TrackItemType';
import { diffAndFormatShort } from '../../utils';
import { filterItems } from '../Timeline/timeline.utils';
import { FilterDropdown, FilterInput, Highlight, TotalCount } from './TrackItemTable.styles';
import { Logger } from '../../logger';
import { deleteByIds } from '../../services/trackItem.api';

const checkIfOneDay = visibleTimerange => visibleTimerange[0].isSame(visibleTimerange[1], 'day');

const calculateTotal = filteredData => {
    const totalMs = _.sumBy(filteredData, c =>
        convertDate(c.endDate).diff(convertDate(c.beginDate)),
    );
    const dur = moment.duration(totalMs);

    return <TotalCount>Total {dur.format()}</TotalCount>;
};

const paginationConf: PaginationConfig = {
    showSizeChanger: true,
    pageSizeOptions: ['50', '100', '300', '500'],
};

const deleteTimelineItems = ids => {
    Logger.debug('Delete timeline items', ids);

    if (ids) {
        deleteByIds(ids).then(() => {
            Logger.debug('Deleted timeline items', ids);
            // TODO: reload timerange or remove from timeline
        });
    } else {
        Logger.error('No ids, not deleting from DB');
    }
};

export const TrackItemTable = ({ visibleTimerange, timeItems }) => {
    const [data, setData] = React.useState<any>([]);
    const [state, setState] = React.useState<any>({
        filteredInfo: {},
        sortedInfo: {},
        filterDropdownVisible: false,
        activeType: TrackItemType.AppTrackItem,
        searchText: '',
        filtered: false,
        selectedRowKeys: [],
    });

    const searchInput = React.useRef<any>();

    const filterByAppType = type =>
        type === TrackItemType.AppTrackItem
            ? filterItems(timeItems.appItems, visibleTimerange)
            : filterItems(timeItems.logItems, visibleTimerange);

    React.useEffect(() => {
        const { activeType } = state;

        setData(filterByAppType(activeType));
        setState({
            ...state,
            isOneDay: checkIfOneDay(visibleTimerange),
        });
    }, [timeItems, visibleTimerange]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (searchInput.current) {
            searchInput.current.focus();
        }
    }, [state.filterDropdownVisible]);

    const handleChange = (pagination: any, filters: any, sorter: any) => {
        Logger.debug('Various parameters', pagination, filters, sorter);
        setState({ ...state, filteredInfo: filters, sortedInfo: sorter });
    };

    const clearFilters = () => {
        setState({ ...state, filteredInfo: {} });
    };

    const clearAll = () => {
        setState({ ...state, filteredInfo: {}, sortedInfo: {} });
    };

    const toggleTask = () => {
        const { activeType } = state;

        clearAll();

        const newActiveType =
            activeType === TrackItemType.AppTrackItem
                ? TrackItemType.LogTrackItem
                : TrackItemType.AppTrackItem;

        setData(filterByAppType(newActiveType));
        setState({
            ...state,

            activeType: newActiveType,
            isOneDay: checkIfOneDay(visibleTimerange),
        });
    };

    const onInputChange = e => {
        setState({ ...state, searchText: e.target.value });
    };

    const onSearch = () => {
        const { searchText } = state;
        const reg = new RegExp(searchText, 'gi');
        const filteredData = data
            .map((record: any) => {
                const match = record.title.match(reg);
                if (!match) {
                    return null;
                }
                return {
                    ...record,
                    name: (
                        <span>
                            {record.title
                                .split(reg)
                                .map((text, i) =>
                                    i > 0
                                        ? [<Highlight key={text}>{match[0]}</Highlight>, text]
                                        : text,
                                )}
                        </span>
                    ),
                };
            })
            .filter(record => !!record);

        setData(filteredData);
        setState({
            ...state,
            filterDropdownVisible: false,
            filtered: !!searchText,
        });
    };

    const onSelectChange = selectedRowKeys => {
        Logger.debug('selectedRowKeys changed: ', selectedRowKeys);
        setState({ ...state, selectedRowKeys });
    };

    const deleteSelectedItems = () => {
        const { selectedRowKeys } = state;
        deleteTimelineItems(selectedRowKeys);
        setState({ ...state, selectedRowKeys: [] });
    };

    const { isOneDay, activeType, sortedInfo, filteredInfo } = state;

    const FilterDropdownComp = () => (
        <FilterDropdown>
            <FilterInput>
                <Input
                    ref={searchInput}
                    placeholder="Search name"
                    value={state.searchText}
                    onChange={onInputChange}
                    onPressEnter={onSearch}
                />
            </FilterInput>
            <Button type="primary" onClick={onSearch}>
                Search
            </Button>
        </FilterDropdown>
    );

    const columns = [
        {
            title: 'App',
            dataIndex: 'app',
            key: 'app',
            width: 200,
            filters: [
                { text: 'loginwindow', value: 'loginwindow' },
                { text: 'Google Chrome', value: 'Google Chrome' },
            ],
            filteredValue: filteredInfo.app || null,
            onFilter: (value: any, record: any) => record.app.includes(value),
            sorter: (a: any, b: any) => a.app - b.app,
            sortOrder: sortedInfo.columnKey === 'app' && sortedInfo.order,
        },
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            filterDropdown: FilterDropdownComp,
            filterIcon: (
                <Icon type="search" style={{ color: state.filtered ? '#108ee9' : '#aaa' }} />
            ),
            filterDropdownVisible: state.filterDropdownVisible,
            onFilterDropdownVisibleChange: visible => {
                setState({
                    filterDropdownVisible: visible,
                });

                // TODO: searchInput.current.focus();
            },
            sorter: (a: any, b: any) => a.title.length - b.title.length,
            sortOrder: sortedInfo.columnKey === 'title' && sortedInfo.order,
        },
        {
            title: 'Begin',
            dataIndex: 'beginDate',
            key: 'beginDate',
            width: 170,
            onFilter: (value: any, record: any) => convertDate(record.beginDate) > value,
            sorter: (a: any, b: any) =>
                convertDate(a.beginDate).valueOf() - convertDate(b.beginDate).valueOf(),
            sortOrder: sortedInfo.columnKey === 'beginDate' && sortedInfo.order,
            render: (text, record) => (
                <Moment
                    format={isOneDay ? TIME_FORMAT : DATE_TIME_FORMAT}
                    parse={INPUT_DATE_FORMAT}
                >
                    {record.beginDate}
                </Moment>
            ),
        },
        {
            title: 'End',
            dataIndex: 'endDate',
            key: 'endDate',
            width: 170,
            onFilter: (value: any, record: any) => convertDate(record.endDate) > value,
            sorter: (a: any, b: any) =>
                convertDate(a.endDate).valueOf() - convertDate(b.endDate).valueOf(),
            sortOrder: sortedInfo.columnKey === 'endDate' && sortedInfo.order,

            render: (text, record) => (
                <Moment
                    format={isOneDay ? TIME_FORMAT : DATE_TIME_FORMAT}
                    parse={INPUT_DATE_FORMAT}
                >
                    {record.endDate}
                </Moment>
            ),
        },

        {
            title: 'Dur',
            dataIndex: '',
            key: 'duration',
            width: 80,
            sorter: (a: any, b: any) =>
                convertDate(a.endDate).diff(convertDate(a.beginDate)) -
                convertDate(b.endDate).diff(convertDate(b.beginDate)),
            sortOrder: sortedInfo.columnKey === 'duration' && sortedInfo.order,

            render: (text, record) => (
                <span>{diffAndFormatShort(record.beginDate, record.endDate)}</span>
            ),
        },
    ];

    const { selectedRowKeys } = state;
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };
    const hasSelected = selectedRowKeys.length > 0;
    return (
        <div>
            <Flex p={1}>
                <Box pr={1}>
                    {!hasSelected && (
                        <Button type="primary" onClick={toggleTask}>
                            Showing {activeType === TrackItemType.AppTrackItem ? 'Apps' : 'Logs'}
                        </Button>
                    )}
                    {hasSelected && (
                        <Button
                            type="primary"
                            onClick={deleteSelectedItems}
                            disabled={!hasSelected}
                        >
                            Delete <b> {selectedRowKeys.length} </b> items
                        </Button>
                    )}
                </Box>
                <Box pr={1}>
                    <Button onClick={clearFilters}>Clear filters</Button>
                </Box>
                <Box pr={1}>
                    <Button onClick={clearAll}>Clear filters and sorters</Button>
                </Box>
            </Flex>
            <Flex p={1}>
                <Box pr={1} />
            </Flex>
            <Table
                rowSelection={rowSelection}
                rowKey={(record: any) => `${record.id}`}
                columns={columns}
                pagination={paginationConf}
                dataSource={data}
                onChange={handleChange}
                footer={calculateTotal}
            />
        </div>
    );
};
