import React from 'react';
import { changeColorForApp } from '../../services/appSettings.api';
import { saveTrackItem, deleteByIds, updateTrackItemColor } from '../../services/trackItem.api';
import { TimelineItemEdit } from './TimelineItemEdit';
import { Logger } from '../../logger';

export const TimelineItemEditContainer = props => {
    const { setSelectedTimelineItem } = props;
    const deleteTimelineItem = id => {
        Logger.debug('Delete timeline item', id);

        if (id) {
            deleteByIds(id).then(() => {
                Logger.debug('Deleted timeline items', id);
                // TODO: reload timerange or remove from timeline
            });
            setSelectedTimelineItem(null);
        } else {
            Logger.error('No ids, not deleting from DB');
        }
    };

    const saveTimelineItem = async ({ item, colorScope }) => {
        Logger.debug('Updating color for trackItem', item, colorScope);
        if (colorScope === 'ALL_ITEMS') {
            await changeColorForApp(item.app, item.color);
            await updateTrackItemColor(item.app, item.color);
        } else if (colorScope === 'NEW_ITEMS') {
            await changeColorForApp(item.app, item.color);
            await saveTrackItem(item);
        } else {
            await saveTrackItem(item);
        }

        setSelectedTimelineItem(null);
        // TODO: reload items
    };

    const clearTimelineItem = () => setSelectedTimelineItem(null);

    const moreProps = {
        deleteTimelineItem,
        clearTimelineItem,
        saveTimelineItem,
    };
    return <TimelineItemEdit {...props} {...moreProps} />;
};
