/**
 * Encapsulates the project data, which can be be loaded from or saved to an external resource.
 */
export type ProjectData = {
  name: string
};

export const initProjectData: () => ProjectData = () => ({
  name: 'New Project'
});
