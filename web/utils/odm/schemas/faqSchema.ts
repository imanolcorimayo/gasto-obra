import { Schema } from '../schema';
import type { SchemaDefinition, FetchResult } from '../types';

export class FaqSchema extends Schema {
  protected collectionName = 'faq';

  protected schema: SchemaDefinition = {
    topic: {
      type: 'string',
      required: true,
      maxLength: 50
    },
    topicLabel: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    topicOrder: {
      type: 'number',
      required: true
    },
    question: {
      type: 'string',
      required: true
    },
    answer: {
      type: 'string',
      required: true
    },
    order: {
      type: 'number',
      required: true
    }
  };

  async fetchAll(): Promise<FetchResult> {
    return this.findPublic();
  }
}
