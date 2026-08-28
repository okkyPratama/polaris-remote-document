declare module 'virtual:__federation__' {
  export function __federation_method_ensure(remoteId: string): Promise<void>
  export function __federation_method_getRemote(
    remoteId: string,
    componentName: string
  ): Promise<{ default: React.ComponentType<any> }>
  export function __federation_method_setRemote(
    remoteId: string,
    remoteConfig: {
      url: () => Promise<string>
      format: string
      from: string
    }
  ): void
  export function __federation_method_unwrapDefault(module: any): any
  export function __federation_method_wrapDefault(module: any, need: boolean): any
}

declare module 'remote-document/views/templates' {
  const Component: React.ComponentType<{ canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean }>
  export default Component
}

declare module 'remote-document/views/template-editor' {
  const Component: React.ComponentType
  export default Component
}
