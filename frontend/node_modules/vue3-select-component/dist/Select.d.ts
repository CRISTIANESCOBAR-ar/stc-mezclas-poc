import { ModelValue } from './types/model';
import { Option } from './types/option';
import { Props } from './types/props';
import { Slots } from './types/slots';
declare const _default: <GenericOption extends Option<OptionValue>, OptionValue = string>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{
        readonly "onUpdate:modelValue"?: ((value: ModelValue<OptionValue>) => any) | undefined;
        readonly onOptionSelected?: ((option: GenericOption) => any) | undefined;
        readonly onOptionDeselected?: ((option: GenericOption | null) => any) | undefined;
        readonly onOptionCreated?: ((value: string) => any) | undefined;
        readonly onMenuOpened?: (() => any) | undefined;
        readonly onMenuClosed?: (() => any) | undefined;
        readonly onSearch?: ((value: string) => any) | undefined;
    } & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps, never>, "onUpdate:modelValue" | "onOptionSelected" | "onOptionDeselected" | "onOptionCreated" | "onMenuOpened" | "onMenuClosed" | "onSearch"> & ({
        modelValue: ModelValue<OptionValue>;
    } & Props<GenericOption, OptionValue>) & Partial<{}>> & import('vue').PublicProps;
    expose(exposed: import('vue').ShallowUnwrapRef<{
        inputRef: Readonly<import('vue').ShallowRef<HTMLInputElement | null>>;
        containerRef: Readonly<import('vue').ShallowRef<HTMLDivElement | null>>;
        openMenu: () => void;
        closeMenu: () => void;
        toggleMenu: () => void;
        clear: () => void;
    }>): void;
    attrs: any;
    slots: Readonly<Slots<GenericOption, OptionValue>> & Slots<GenericOption, OptionValue>;
    emit: {
        (e: "optionSelected", option: GenericOption): void;
        (e: "optionDeselected", option: GenericOption | null): void;
        (e: "optionCreated", value: string): void;
        (e: "menuOpened"): void;
        (e: "menuClosed"): void;
        (e: "search", value: string): void;
    } & ((evt: "update:modelValue", value: ModelValue<OptionValue>) => void);
}>) => import('vue').VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_PrettifyLocal<T> = {
    [K in keyof T]: T[K];
} & {};
