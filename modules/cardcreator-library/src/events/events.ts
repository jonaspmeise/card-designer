import { DomainEvent } from '../types/events';

export class ProjectLoadedEvent extends DomainEvent<{
  projectName: string;
}> {
  constructor(data: { projectName: string }) {
    super('projectLoaded', data);
  }
}

export class FileOpenedEvent extends DomainEvent<{
  filePath: string;
}> {
  constructor(data: { filePath: string }) {
    super('fileOpened', data);
  }
}
