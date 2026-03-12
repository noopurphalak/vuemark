interface BaseProps {
  /** Base ID */
  id: string;
}

export interface ExtendedProps extends BaseProps {
  /** Extended label */
  label: string;
  /** Extended count */
  count?: number;
}
