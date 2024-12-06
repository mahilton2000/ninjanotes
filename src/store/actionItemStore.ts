import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  Query,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActionItem } from '../types/actionItem';
import toast from 'react-hot-toast';

interface ActionItemStore {
  getActionItemsQuery: (meetingId: string, userId: string) => Query;
  addActionItem: (item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateActionItem: (itemId: string, updates: Partial<Omit<ActionItem, 'id' | 'meetingId' | 'userId'>>) => Promise<void>;
  deleteActionItem: (itemId: string) => Promise<void>;
  toggleComplete: (itemId: string, currentStatus: string) => Promise<void>;
}

export const useActionItemStore = create<ActionItemStore>(() => ({
  getActionItemsQuery: (meetingId: string, userId: string) => {
    return query(
      collection(db, 'actionItems'),
      where('meetingId', '==', meetingId),
      where('userId', '==', userId)
    );
  },

  addActionItem: async (item) => {
    try {
      const docData = {
        ...item,
        dueDate: item.dueDate instanceof Date ? 
          Timestamp.fromDate(item.dueDate) : 
          Timestamp.fromDate(new Date(item.dueDate)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'actionItems'), docData);
    } catch (error: any) {
      console.error('Error creating action item:', error);
      throw new Error('Failed to create action item');
    }
  },

  updateActionItem: async (itemId, updates) => {
    try {
      const docRef = doc(db, 'actionItems', itemId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      if (updates.dueDate) {
        updateData.dueDate = updates.dueDate instanceof Date 
          ? Timestamp.fromDate(updates.dueDate)
          : Timestamp.fromDate(new Date(updates.dueDate));
      }

      await updateDoc(docRef, updateData);
    } catch (error: any) {
      console.error('Error updating action item:', error);
      throw new Error('Failed to update action item');
    }
  },

  deleteActionItem: async (itemId) => {
    try {
      const docRef = doc(db, 'actionItems', itemId);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Error deleting action item:', error);
      throw new Error('Failed to delete action item');
    }
  },

  toggleComplete: async (itemId, currentStatus) => {
    try {
      const docRef = doc(db, 'actionItems', itemId);
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error: any) {
      console.error('Error toggling action item status:', error);
      throw new Error('Failed to update action item status');
    }
  }
}));