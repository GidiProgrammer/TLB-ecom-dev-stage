export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor: string
          at: string
          entity_id: string
          entity_type: string
          id: string
          meta: Json | null
          summary: string
        }
        Insert: {
          action: string
          actor: string
          at?: string
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json | null
          summary: string
        }
        Update: {
          action?: string
          actor?: string
          at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json | null
          summary?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_lines: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_qty: number
          id: string
          line_status: string
          order_id: string
          ordered_qty: number
          product_id: string
          reserved_qty: number
          supplied_qty: number
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_qty?: number
          id?: string
          line_status: string
          order_id: string
          ordered_qty: number
          product_id: string
          reserved_qty?: number
          supplied_qty?: number
          unit_price?: number
          warehouse_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_qty?: number
          id?: string
          line_status?: string
          order_id?: string
          ordered_qty?: number
          product_id?: string
          reserved_qty?: number
          supplied_qty?: number
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_order_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "customer_order_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_purchase_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_po_number: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          notes: string | null
          number: string
          order_date: string
          required_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_po_number?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          notes?: string | null
          number: string
          order_date?: string
          required_date?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_po_number?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          notes?: string | null
          number?: string
          order_date?: string
          required_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_purchase_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_purchase_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          category: string
          code: string
          contact_name: string | null
          created_at: string
          credit_limit: number
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string
          phone: string | null
          tin: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          category: string
          code: string
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string
          phone?: string | null
          tin?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string
          code?: string
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string
          phone?: string | null
          tin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          address: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          customer_id: string
          delivery_date: string
          driver: string | null
          id: string
          method: string
          notes: string | null
          number: string
          order_id: string
          receiver_contact: string | null
          receiver_name: string | null
          status: string
          supply_id: string
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          address: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          delivery_date?: string
          driver?: string | null
          id?: string
          method: string
          notes?: string | null
          number: string
          order_id: string
          receiver_contact?: string | null
          receiver_name?: string | null
          status: string
          supply_id: string
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          address?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          delivery_date?: string
          driver?: string | null
          id?: string
          method?: string
          notes?: string | null
          number?: string
          order_id?: string
          receiver_contact?: string | null
          receiver_name?: string | null
          status?: string
          supply_id?: string
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "deliveries_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          delivery_id: string
          id: string
          order_line_id: string | null
          product_id: string
          quantity: number
          supply_line_id: string | null
        }
        Insert: {
          delivery_id: string
          id?: string
          order_line_id?: string | null
          product_id: string
          quantity: number
          supply_line_id?: string | null
        }
        Update: {
          delivery_id?: string
          id?: string
          order_line_id?: string | null
          product_id?: string
          quantity?: number
          supply_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "customer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "delivery_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "delivery_items_supply_line_id_fkey"
            columns: ["supply_line_id"]
            isOneToOne: false
            referencedRelation: "supply_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          customer_seq: number
          delivery_seq: number
          id: number
          invoice_seq: number
          order_seq: number
          payment_seq: number
          receipt_seq: number
          supply_seq: number
        }
        Insert: {
          customer_seq?: number
          delivery_seq?: number
          id?: number
          invoice_seq?: number
          order_seq?: number
          payment_seq?: number
          receipt_seq?: number
          supply_seq?: number
        }
        Update: {
          customer_seq?: number
          delivery_seq?: number
          id?: number
          invoice_seq?: number
          order_seq?: number
          payment_seq?: number
          receipt_seq?: number
          supply_seq?: number
        }
        Relationships: []
      }
      experiments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_subtotal: number
          line_total: number
          order_line_id: string | null
          product_id: string
          quantity: number
          supply_line_id: string | null
          unit_price: number
          vat_amount: number
          vat_rate_id: string | null
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_subtotal?: number
          line_total?: number
          order_line_id?: string | null
          product_id: string
          quantity: number
          supply_line_id?: string | null
          unit_price?: number
          vat_amount?: number
          vat_rate_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_subtotal?: number
          line_total?: number
          order_line_id?: string | null
          product_id?: string
          quantity?: number
          supply_line_id?: string | null
          unit_price?: number
          vat_amount?: number
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "customer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_lines_supply_line_id_fkey"
            columns: ["supply_line_id"]
            isOneToOne: false
            referencedRelation: "supply_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          billing_address: string | null
          created_at: string
          customer_id: string
          customer_po_number: string | null
          customer_tin: string | null
          id: string
          invoice_date: string
          notes: string | null
          number: string
          order_id: string
          payment_status: string
          prepared_by: string
          subtotal: number
          supply_id: string | null
          total: number
          updated_at: string
          vat_amount: number
          vat_rate_id: string | null
        }
        Insert: {
          amount_paid?: number
          billing_address?: string | null
          created_at?: string
          customer_id: string
          customer_po_number?: string | null
          customer_tin?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          number: string
          order_id: string
          payment_status?: string
          prepared_by: string
          subtotal?: number
          supply_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate_id?: string | null
        }
        Update: {
          amount_paid?: number
          billing_address?: string | null
          created_at?: string
          customer_id?: string
          customer_po_number?: string | null
          customer_tin?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          number?: string
          order_id?: string
          payment_status?: string
          prepared_by?: string
          subtotal?: number
          supply_id?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "invoices_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          id: string
          order_id: string | null
          product_id: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          institution: string | null
          payment_reference: string | null
          reference: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_email: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution?: string | null
          payment_reference?: string | null
          reference: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_email?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution?: string | null
          payment_reference?: string | null
          reference?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_email?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          number: string
          order_id: string | null
          payment_date: string
          receipt_id: string | null
          recorded_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_id?: string | null
          method: string
          notes?: string | null
          number: string
          order_id?: string | null
          payment_date?: string
          receipt_id?: string | null
          recorded_by: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          number?: string
          order_id?: string | null
          payment_date?: string
          receipt_id?: string | null
          recorded_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          id: string
          image_url: string | null
          institutional_price: number | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          price: number
          sku: string | null
          slug: string
          stock_quantity: number
          unit_label: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          institutional_price?: number | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          sku?: string | null
          slug: string
          stock_quantity?: number
          unit_label?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          institutional_price?: number | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          slug?: string
          stock_quantity?: number
          unit_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          full_name: string | null
          id: string
          institution_name: string | null
          institution_type: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name?: string | null
          id: string
          institution_name?: string | null
          institution_type?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name?: string | null
          id?: string
          institution_name?: string | null
          institution_type?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string
          quoted_price: number | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          quote_id: string
          quoted_price?: number | null
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          quoted_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          institution: string | null
          notes: string | null
          reference: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          notes?: string | null
          reference: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          notes?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_lines: {
        Row: {
          description: string
          id: string
          line_total: number
          product_id: string | null
          quantity: number
          receipt_id: string
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          receipt_id: string
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          receipt_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          amount_paid: number
          balance: number
          created_at: string
          customer_id: string
          id: string
          invoice_id: string | null
          notes: string | null
          number: string
          order_id: string | null
          payment_method: string
          processed_by: string
          receipt_date: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          number: string
          order_id?: string | null
          payment_method: string
          processed_by: string
          receipt_date?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          number?: string
          order_id?: string | null
          payment_method?: string
          processed_by?: string
          receipt_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          id: string
          physical_qty: number
          product_id: string
          reserved_qty: number
          warehouse_id: string
        }
        Insert: {
          id?: string
          physical_qty?: number
          product_id: string
          reserved_qty?: number
          warehouse_id: string
        }
        Update: {
          id?: string
          physical_qty?: number
          product_id?: string
          reserved_qty?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          change_qty: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          reason: Database["public"]["Enums"]["stock_reason"]
          reference_id: string | null
        }
        Insert: {
          change_qty: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          reason: Database["public"]["Enums"]["stock_reason"]
          reference_id?: string | null
        }
        Update: {
          change_qty?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          reason?: Database["public"]["Enums"]["stock_reason"]
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          expires_at: string | null
          id: string
          order_line_id: string
          product_id: string
          quantity: number
          release_reason: string | null
          released_at: string | null
          reserved_at: string
          reserved_by: string
          warehouse_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          order_line_id: string
          product_id: string
          quantity: number
          release_reason?: string | null
          released_at?: string | null
          reserved_at?: string
          reserved_by: string
          warehouse_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          order_line_id?: string
          product_id?: string
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          reserved_at?: string
          reserved_by?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "customer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          id: string
          notes: string | null
          number: string
          order_id: string
          supplied_at: string
          supplied_by: string
        }
        Insert: {
          id?: string
          notes?: string | null
          number: string
          order_id: string
          supplied_at?: string
          supplied_by: string
        }
        Update: {
          id?: string
          notes?: string | null
          number?: string
          order_id?: string
          supplied_at?: string
          supplied_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["order_id"]
          },
        ]
      }
      supply_lines: {
        Row: {
          id: string
          order_line_id: string
          product_id: string
          quantity: number
          supply_id: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          order_line_id: string
          product_id: string
          quantity: number
          supply_id: string
          warehouse_id: string
        }
        Update: {
          id?: string
          order_line_id?: string
          product_id?: string
          quantity?: number
          supply_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "customer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "supply_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supply_lines_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_customer_supplies"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "supply_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_submissions: {
        Row: {
          created_at: string
          id: string
          nonce: string
          operation: string
          order_id: string | null
          quote_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nonce: string
          operation: string
          order_id?: string | null
          quote_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nonce?: string
          operation?: string
          order_id?: string | null
          quote_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactional_email_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          delivery_status: Database["public"]["Enums"]["transactional_email_status"]
          entity_id: string
          entity_type: string
          event_key: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["transactional_email_status"]
          entity_id: string
          entity_type: string
          event_key: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient_email: string
          sent_at?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["transactional_email_status"]
          entity_id?: string
          entity_type?: string
          event_key?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient_email?: string
          sent_at?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vat_rates: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
          rate_percent: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
          rate_percent?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
          rate_percent?: number
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          active: boolean
          code: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          location: string | null
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_outstanding_customer_supplies: {
        Row: {
          available_qty: number | null
          cancelled_qty: number | null
          confirmed_at: string | null
          customer_id: string | null
          customer_name: string | null
          line_id: string | null
          line_status: string | null
          order_date: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          ordered_qty: number | null
          outstanding_qty: number | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          reserved_qty: number | null
          supplied_qty: number | null
          unit_price: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_transactional_email_outbox: {
        Args: {
          p_limit?: number
          p_max_attempts?: number
          p_stale_after?: unknown
        }
        Returns: {
          attempt_count: number
          created_at: string
          delivery_status: Database["public"]["Enums"]["transactional_email_status"]
          entity_id: string
          entity_type: string
          event_key: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          template_id: string
          updated_at: string
        }[]
      }
      create_order_with_items: {
        Args: {
          p_institution: string
          p_items: Json
          p_shipping_address: string
          p_shipping_city: string
          p_shipping_email: string
          p_shipping_name: string
          p_shipping_phone: string
          p_submission_nonce: string
          p_user_id: string
        }
        Returns: string
      }
      create_quote_with_items: {
        Args: {
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_institution: string
          p_items: Json
          p_notes: string
          p_submission_nonce: string
          p_user_id: string
        }
        Returns: Json
      }
      decrement_stock: {
        Args: { _order_id: string; _product_id: string; _qty: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restock_product: {
        Args: { _note?: string; _product_id: string; _qty: number }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "individual" | "institutional"
      app_role: "admin" | "staff"
      approval_status: "pending" | "approved" | "rejected"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "completed"
        | "cancelled"
        | "payment_failed"
      quote_status:
        | "submitted"
        | "reviewed"
        | "quoted"
        | "accepted"
        | "declined"
      stock_reason: "restock" | "sale" | "adjustment" | "damaged" | "return"
      transactional_email_status: "pending" | "sending" | "sent" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["individual", "institutional"],
      app_role: ["admin", "staff"],
      approval_status: ["pending", "approved", "rejected"],
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "payment_failed",
      ],
      quote_status: ["submitted", "reviewed", "quoted", "accepted", "declined"],
      stock_reason: ["restock", "sale", "adjustment", "damaged", "return"],
      transactional_email_status: ["pending", "sending", "sent", "failed"],
    },
  },
} as const
