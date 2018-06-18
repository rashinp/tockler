import * as moment from 'moment';
import { TrackItemService } from '../services/TrackItemService';
import { handleItems } from './summary.util';

export const summaryModel: any = {
    namespace: 'summary',
    state: {
        AppTrackItem: [],
        StatusTrackItem: [],
        LogTrackItem: [],
        selectedDate: moment(),
        selectedMode: 'month',
    },

    subscriptions: {
        setup({ dispatch }: any) {
            console.log('Summary data setup');

            dispatch({
                type: 'loadSummary',
                payload: { selectedDate: moment(), selectedMode: 'month' },
            });
        },
    },

    effects: {
        *changeSelectedDate({ payload: { selectedDate, selectedMode } }: any, { call, put }: any) {
            console.log('selectedDate changed:', selectedDate, selectedMode);
            yield put({
                type: 'setSelectedDate',
                payload: { selectedDate },
            });

            yield put({
                type: 'setSelectedMode',
                payload: { selectedMode },
            });
        },

        *loadSummary({ payload: { selectedDate, selectedMode } }: any, { call, put }: any) {
            console.log('Change selectedDate:', selectedDate, selectedMode);

            const beginDate = moment(selectedDate)
                .startOf(selectedMode)
                .toDate();
            const endDate = moment(selectedDate)
                .endOf(selectedMode)
                .toDate();

            const { appItems, statusItems, logItems } = yield call(
                TrackItemService.findAllItems,
                beginDate,
                endDate,
            );

            yield put({
                type: 'loadItems',
                payload: {
                    logTrackItems: logItems,
                    statusTrackItems: statusItems,
                    appTrackItems: appItems,
                },
            });
            yield put({
                type: 'setSelectedDate',
                payload: { selectedDate },
            });
        },
    },
    reducers: {
        loadItems(state: any, { payload }: any) {
            return handleItems(state, payload);
        },

        setSelectedDate(state: any, { payload: { selectedDate } }: any) {
            return {
                ...state,
                selectedDate,
            };
        },
        setSelectedMode(state: any, { payload: { selectedMode } }: any) {
            return {
                ...state,
                selectedMode,
            };
        },
    },
};
