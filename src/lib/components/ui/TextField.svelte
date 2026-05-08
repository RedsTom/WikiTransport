<script lang="ts">
	let {
		label = '',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		oninput,
		onchange,
		inputId = '',
		class: className = '',
		...rest
	}: {
		label?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		inputId?: string;
		class?: string;
		[key: string]: unknown;
	} = $props();

	let id = $derived(inputId || `tf-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class="m3-field {className}">
	<input
		{id}
		class="m3-field__input"
		{disabled}
		{placeholder}
		bind:value
		{oninput}
		{onchange}
		{...rest}
	/>
	<label for={id} class="m3-field__label">{label}</label>
</div>
