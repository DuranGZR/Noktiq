<script setup lang="ts">
defineOptions({ name: 'PaymentButton' });
</script>
<template>
  <button data-testid="checkout-pay" class="pay-button" aria-label="Complete payment">
    <span>Pay now</span>
  </button>
</template>
