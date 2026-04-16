import { HTMLAttributes } from 'vue';
import { ModelValue } from './types/model';
import { Option } from './types/option';
import { MenuSlots } from './types/slots';
declare const _default: <GenericOption extends Option<OptionValue>, OptionValue = string>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{
        readonly "onUpdate:modelValue"?: ((value: ModelValue<OptionValue>) => any) | undefined;
    } & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps, never>, "onUpdate:modelValue"> & ({
        modelValue: ModelValue<OptionValue>;
    } & {
        slots: MenuSlots<GenericOption, OptionValue>;
        rootClass?: HTMLAttributes["class"];
    }) & Partial<{}>> & import('vue').PublicProps;
    expose(exposed: import('vue').ShallowUnwrapRef<{}>): void;
    attrs: any;
    slots: {};
    emit: (evt: "update:modelValue", value: ModelValue<OptionValue>) => void;
}>) => import('vue').VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_PrettifyLocal<T> = {
    [K in keyof T]: T[K];
} & {};
