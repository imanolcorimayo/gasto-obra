import { Validator } from './validator';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
  type QuerySnapshot,
  type Unsubscribe
} from 'firebase/firestore'
import { getFirestoreInstance, getCurrentUser } from '~/utils/firebase'
import type {
  SchemaDefinition,
  ValidationResult,
  QueryOptions,
  DocumentWithId,
  CreateResult,
  UpdateResult,
  DeleteResult,
  FetchResult,
  FetchSingleResult
} from './types';

export abstract class Schema {
  protected abstract collectionName: string;
  protected abstract schema: SchemaDefinition;

  private _db: ReturnType<typeof getFirestoreInstance> | null = null;

  private get db() {
    if (!this._db) {
      this._db = getFirestoreInstance();
    }
    return this._db;
  }

  constructor() {}

  protected getCurrentUserId(): string | null {
    const user = getCurrentUser();
    return user ? user.uid : null;
  }

  protected formatDate(timestamp: any): string {
    try {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('es-AR');
      }
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('es-AR');
      }
      return '';
    } catch {
      return '';
    }
  }

  validate(data: any): ValidationResult {
    return Validator.validateDocument(data, this.schema);
  }

  applyDefaults(data: any): any {
    return Validator.applyDefaults(data, this.schema);
  }

  protected prepareForSave(data: any, isUpdate = false): any {
    const userId = this.getCurrentUserId();

    if (!userId) {
      throw new Error('Usuario debe estar autenticado para guardar documentos');
    }

    let prepared = { ...data };
    prepared = this.applyDefaults(prepared);

    if (!prepared.userId && this.schema.userId) {
      prepared.userId = userId;
    }

    if (!isUpdate) {
      prepared.createdAt = serverTimestamp();
    }

    prepared.updatedAt = serverTimestamp();

    return prepared;
  }

  protected convertFirestoreDoc(docSnapshot: any): DocumentWithId {
    const data = docSnapshot.data();
    const id = docSnapshot.id;

    const convertedData: DocumentWithId = {
      id,
      ...data,
    };

    if (data.createdAt) {
      convertedData.createdAtFormatted = this.formatDate(data.createdAt);
    }
    if (data.updatedAt) {
      convertedData.updatedAtFormatted = this.formatDate(data.updatedAt);
    }

    return convertedData;
  }

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected buildUserQuery(additionalConstraints: QueryConstraint[] = [], userField = 'userId'): any {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario debe estar autenticado para consultar documentos');
    }

    const baseConstraints = [where(userField, '==', userId)];
    return query(this.getCollectionRef(), ...baseConstraints, ...additionalConstraints);
  }

  protected addSystemFields(data: any, userField = 'userId'): any {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario debe estar autenticado para crear documentos');
    }

    let updatedData = { ...data };

    if (this.schema[userField]?.required) {
      updatedData[userField] = userId;
    }

    updatedData.createdAt = serverTimestamp();
    updatedData.updatedAt = serverTimestamp();

    return updatedData;
  }

  async create(data: any): Promise<CreateResult> {
    try {
      data = this.addSystemFields(data);

      const validation = this.validate(data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validacion fallida: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const prepared = this.prepareForSave(data, false);
      const docRef = await addDoc(this.getCollectionRef(), prepared);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'El documento no fue creado exitosamente' };
      }

      return {
        success: true,
        data: this.convertFirestoreDoc(docSnapshot)
      };
    } catch (error) {
      console.error(`Error creando ${this.collectionName}:`, error);
      return { success: false, error: `Error al crear documento: ${error}` };
    }
  }

  async update(id: string, data: any): Promise<UpdateResult> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Usuario debe estar autenticado' };
      }

      const docRef = doc(this.getCollectionRef(), id);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'Documento no encontrado' };
      }

      const prepared = this.prepareForSave(data, true);
      await updateDoc(docRef, prepared);

      return { success: true };
    } catch (error) {
      console.error(`Error actualizando ${this.collectionName}:`, error);
      return { success: false, error: `Error al actualizar documento: ${error}` };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Usuario debe estar autenticado' };
      }

      const docRef = doc(this.getCollectionRef(), id);
      await deleteDoc(docRef);

      return { success: true };
    } catch (error) {
      console.error(`Error eliminando ${this.collectionName}:`, error);
      return { success: false, error: `Error al eliminar documento: ${error}` };
    }
  }

  async findById(id: string): Promise<FetchSingleResult> {
    try {
      const docRef = doc(this.getCollectionRef(), id);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'Documento no encontrado' };
      }

      return {
        success: true,
        data: this.convertFirestoreDoc(docSnapshot)
      };
    } catch (error) {
      console.error(`Error buscando ${this.collectionName} por ID:`, error);
      return { success: false, error: `Error al buscar documento: ${error}` };
    }
  }

  async find(options: QueryOptions = {}, userField = 'userId'): Promise<FetchResult> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Usuario debe estar autenticado' };
      }

      const constraints: QueryConstraint[] = [];

      if (options.where) {
        for (const condition of options.where) {
          constraints.push(where(condition.field, condition.operator, condition.value));
        }
      }

      if (options.orderBy) {
        for (const order of options.orderBy) {
          constraints.push(orderBy(order.field, order.direction));
        }
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = this.buildUserQuery(constraints, userField);
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));

      return { success: true, data: documents };
    } catch (error) {
      console.error(`Error buscando ${this.collectionName}:`, error);
      return { success: false, error: `Error al buscar documentos: ${error}` };
    }
  }

  // Query without user scoping (for public pages like client view)
  async findPublic(options: QueryOptions = {}): Promise<FetchResult> {
    try {
      const constraints: QueryConstraint[] = [];

      if (options.where) {
        for (const condition of options.where) {
          constraints.push(where(condition.field, condition.operator, condition.value));
        }
      }

      if (options.orderBy) {
        for (const order of options.orderBy) {
          constraints.push(orderBy(order.field, order.direction));
        }
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(this.getCollectionRef(), ...constraints);
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));

      return { success: true, data: documents };
    } catch (error) {
      console.error(`Error buscando ${this.collectionName}:`, error);
      return { success: false, error: `Error al buscar documentos: ${error}` };
    }
  }

  subscribeToCollection(
    callback: (documents: DocumentWithId[]) => void,
    options: QueryOptions = {},
    userField = 'userId'
  ): Unsubscribe | null {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.error('Usuario debe estar autenticado');
        return null;
      }

      const constraints: QueryConstraint[] = [];

      if (options.where) {
        for (const condition of options.where) {
          constraints.push(where(condition.field, condition.operator, condition.value));
        }
      }

      if (options.orderBy) {
        for (const order of options.orderBy) {
          constraints.push(orderBy(order.field, order.direction));
        }
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = this.buildUserQuery(constraints, userField);

      return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
        const documents = querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
        callback(documents);
      }, (error) => {
        console.error(`Error en suscripcion de ${this.collectionName}:`, error);
      });
    } catch (error) {
      console.error(`Error configurando suscripcion de ${this.collectionName}:`, error);
      return null;
    }
  }
}
