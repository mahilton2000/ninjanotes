import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { ActionItem } from '../types/actionItem';
import ActionItemCalendarView from '../components/actionItems/ActionItemCalendarView';
import TimelineView from '../components/actionItems/TimelineView';
import ViewToggle from '../components/common/ViewToggle';
import { useActionItemStore } from '../store/actionItemStore';
import { parse, isValid } from 'date-fns';
import toast from 'react-hot-toast';

export default function CalendarView() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar');
  const { user } = useAuthStore();
  const { toggleComplete } = useActionItemStore();

  // Helper function to safely parse any date format
  const parseDateSafely = (dateValue: any): Date => {
    try {
      // If it's null or undefined, return current date
      if (!dateValue) {
        return new Date();
      }

      // If it's already a Date object
      if (dateValue instanceof Date) {
        return isValid(dateValue) ? dateValue : new Date();
      }

      // If it's a Firebase Timestamp
      if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
        const date = dateValue.toDate();
        return isValid(date) ? date : new Date();
      }

      // If it's a timestamp number
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        return isValid(date) ? date : new Date();
      }

      // If it's a string, try multiple formats
      if (typeof dateValue === 'string') {
        // Try ISO format first
        let date = new Date(dateValue);
        if (isValid(date)) return date;

        // Try common date formats
        const formats = [
          'yyyy-MM-dd',
          'MM/dd/yyyy',
          'MMMM d, yyyy',
          'dd-MM-yyyy',
          'yyyy/MM/dd'
        ];

        for (const format of formats) {
          date = parse(dateValue, format, new Date());
          if (isValid(date)) return date;
        }
      }

      // If all parsing attempts fail, return current date
      return new Date();
    } catch (error) {
      console.warn('Date parsing failed:', error);
      return new Date();
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'actionItems'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const actionItems = snapshot.docs.map(doc => {
            const data = doc.data();
            let dueDate: Date;

            try {
              dueDate = parseDateSafely(data.dueDate);
            } catch (error) {
              console.warn(`Date parsing failed for item ${doc.id}:`, error);
              dueDate = new Date(); // Fallback to current date
            }

            return {
              id: doc.id,
              ...data,
              dueDate
            } as ActionItem;
          });

          setItems(actionItems);
        } catch (error) {
          console.error('Error processing action items:', error);
          toast.error('Error loading some action items');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching action items:', error);
        toast.error('Failed to load action items');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleToggleComplete = async (item: ActionItem) => {
    try {
      await toggleComplete(item.id, item.status);
    } catch (error) {
      console.error('Error toggling item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const handleEdit = (item: ActionItem) => {
    window.location.href = `/meeting/${item.meetingId}?action=edit&itemId=${item.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Action Items</h1>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="transition-opacity duration-300 ease-in-out">
        {view === 'calendar' ? (
          <ActionItemCalendarView
            items={items}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
          />
        ) : (
          <TimelineView
            items={items}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}